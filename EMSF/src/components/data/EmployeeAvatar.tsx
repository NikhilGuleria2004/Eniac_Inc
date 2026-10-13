import { Avatar } from "../ui/Avatar";

interface EmployeeAvatarProps {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
}

export function EmployeeAvatar({ firstName, lastName, avatar, size = "md" }: EmployeeAvatarProps) {
  const name = `${firstName || ""} ${lastName || ""}`.trim();

  return <Avatar name={name} src={avatar} size={size} />;
}
