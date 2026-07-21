import M3Button, { type M3ButtonProps } from "./m3-button";

type M3TonalButtonProps = Omit<M3ButtonProps, "variant">;

export default function M3TonalButton(props: M3TonalButtonProps) {
  return <M3Button variant="tonal" {...props} />;
}
