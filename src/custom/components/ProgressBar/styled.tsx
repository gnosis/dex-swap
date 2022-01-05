import styled from 'styled-components/macro'
import * as CSS from 'csstype'
import { FlexWrap as FlexWrapMod } from 'pages/Profile/styled'

export const FlexWrap = styled(FlexWrapMod)`
  max-width: 100%;
  align-items: flex-end;
`

export const ProgressBarWrap = styled(FlexWrapMod)`
  max-width: 500px; //optional
  padding-top: 40px;
  position: relative;
`

export const ProgressContainer = styled.div`
  background-color: ${({ theme }) => theme.primary1};
  height: 16px;
  width: 100% !important;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
`

export const Progress = styled.div<Partial<CSS.Properties & { value: number }>>`
  background-color: ${({ theme }) => theme.primary1};
  width: 100%;
  max-width: ${(props) => props.value}%;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  transition: max-width 0.2s;
`

export const Label = styled.a<Partial<CSS.Properties & { position: any }>>`
  cursor: pointer;
  position: absolute;
  color: ${({ theme }) => theme.text1};
  top: 10px;
  left: ${(props) => props.position}%;
  transform: translateX(-50%);
  font-weight: bold;
  text-decoration: underline;

  &:first-child,
  &:last-child {
    transform: none;
  }

  &:hover {
    text-decoration: none;
  }
`
