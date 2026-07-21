import M3Button, { type M3ButtonProps } from "./m3-button";

type M3OutlinedButtonProps = Omit<M3ButtonProps, "variant">;

export default function M3OutlinedButton(props: M3OutlinedButtonProps) {
  return <M3Button variant="outlined" {...props} />;
}
