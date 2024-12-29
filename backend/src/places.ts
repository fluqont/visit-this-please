import { Router } from "express";
import { ErrorWithStatus } from "./lib/error.ts";
import { object, string, enum as zodEnum } from "zod";
import { isUser } from "./auth/controllers.ts";
import { Place } from "./db/config.ts";
import { COUNTRIES } from "./lib/const.ts";

const router = Router();

const addPlaceSchema = object({
  country: zodEnum(COUNTRIES, { description: "Invalid country" }),
  stateOrRegion: string().optional(),
  settlement: string().optional(),
  name: string().optional(),

  street: string().optional(),
  house: string().optional(),
}).refine(({ stateOrRegion, settlement, street, house, name }) => {
  let settlementIsFine = true,
    streetIsFine = true,
    houseIsFine = true;
  if (settlement) {
    settlementIsFine = !!stateOrRegion;
  }
  if (street) {
    streetIsFine = !!settlement && !!name;
  }
  if (house) {
    houseIsFine = !!street && !!name;
  }
  return settlementIsFine && streetIsFine && houseIsFine;
});

router.get("/", async (req, res) => {
  const { sort = "positivity", page = 1, search = "" } = req.query;

  if (typeof search !== "string") {
    throw new ErrorWithStatus("Search type is invalid", 400);
  }

  const places = search
    ? await Place.find({ $text: { $search: search } })
    : await Place.find();
  switch (sort) {
    case "votes":
      places.sort((a, b) => b.votes.length - a.votes.length);
      break;
    case "upvotes":
      places.sort(
        (a, b) =>
          b.votes.filter((vote) => vote.type === "UP").length -
          a.votes.filter((vote) => vote.type === "UP").length
      );
      break;
    case "downvotes":
      places.sort(
        (a, b) =>
          b.votes.filter((vote) => vote.type === "DOWN").length -
          a.votes.filter((vote) => vote.type === "DOWN").length
      );
      break;
    case "positivity":
      places.sort(
        (a, b) =>
          b.votes.filter((vote) => vote.type === "UP").length -
          b.votes.filter((vote) => vote.type === "DOWN").length -
          (a.votes.filter((vote) => vote.type === "UP").length -
            a.votes.filter((vote) => vote.type === "DOWN").length)
      );
      break;
    case "negativity":
      places.sort(
        (a, b) =>
          a.votes.filter((vote) => vote.type === "UP").length -
          a.votes.filter((vote) => vote.type === "DOWN").length -
          (b.votes.filter((vote) => vote.type === "UP").length -
            b.votes.filter((vote) => vote.type === "DOWN").length)
      );
      break;
    case "last-voted":
      places.sort(
        (a, b) =>
          Math.max(
            ...b.votes.map((vote) => vote._id.getTimestamp().getTime())
          ) -
          Math.max(...a.votes.map((vote) => vote._id.getTimestamp().getTime()))
      );
      break;
    case "last-added":
      places.sort(
        (a, b) =>
          b._id.getTimestamp().getTime() - a._id.getTimestamp().getTime()
      );
  }

  const PAGE_LENGTH = 5;
  res.json(
    places
      .slice(
        Number(page) * PAGE_LENGTH,
        Number(page) * PAGE_LENGTH + PAGE_LENGTH
      )
      .map(
        ({
          country,
          stateOrRegion,
          settlement,
          name,
          street,
          house,
          _id,
          votes,
        }) => {
          let voted: "UP" | "DOWN" | undefined;
          let up = 0;
          let down = 0;

          for (const { userId, type } of votes) {
            if (userId.toString() === req.user?.id) {
              voted = type;
            }

            switch (type) {
              case "UP":
                up++;
                break;
              case "DOWN":
                down++;
            }
          }

          return {
            _id,
            country,
            stateOrRegion,
            settlement,
            name,
            street,
            house,
            voted,
            up,
            down,
          };
        }
      )
  );
});

router.post("/", isUser, async (req, res) => {
  const parsedSchema = addPlaceSchema.safeParse(req.body);

  if (!parsedSchema.success) {
    throw new ErrorWithStatus("Incorrect data", 400);
  }

  const [place] = await Place.insertMany([
    { ...parsedSchema.data, userId: req.user!.id },
  ]);

  if (!place) {
    throw new Error();
  }

  res.json({ status: "success" });
});

router.patch("/:id/votes", isUser, async (req, res) => {
  const { id } = req.params;

  if (!req.body.type) {
    throw new ErrorWithStatus("No type", 400);
  }

  const place = await Place.findById(id);

  if (!place) {
    throw new Error();
  }

  let voted = false;
  place.votes.map((vote) => {
    if (vote.userId.toString() === req.user?.id) {
      voted = true;
      vote.type = req.body.type;
    }
    return vote;
  });
  if (!voted) {
    place.votes.push({ type: req.body.type, userId: req.user!.id });
  }

  await place.save();

  res.json({ status: "success" });
});

export default router;
