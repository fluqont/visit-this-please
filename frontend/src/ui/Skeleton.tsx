import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
`;

const Skeleton = styled.div<{
  $width: string;
  $height: string;
  $marginTop?: string;
}>`
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: var(--surface-container-high);
  height: ${(props) => props.$height};
  width: ${(props) => props.$width};
  margin-top: ${(props) => props.$marginTop ?? "0"};
`;
export default Skeleton;
