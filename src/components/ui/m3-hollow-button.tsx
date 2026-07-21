import M3Button, { type M3ButtonProps } from "./m3-button";

type M3HollowButtonProps = Omit<M3ButtonProps, "variant">;

export default function M3HollowButton(props: M3HollowButtonProps) {
  return <M3Button variant="hollow" {...props} />;
}
