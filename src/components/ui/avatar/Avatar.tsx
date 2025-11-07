import React from "react";

interface AvatarProps {
  name: string;
  email?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  email,
  imageUrl = "/user.svg",
  size = "md",
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8">
        <img
          src={imageUrl}
          alt="Avatar de usuario"
          className="w-full h-full rounded-full object-cover opacity-30"
        />
      </div>
      <div>
        <div className="font-bold text-[16px] text-left">{name}</div>
        <div className="text-gray-500 text-[14px] font-medium text-left">
          {email}
        </div>
      </div>
    </div>
  );
};

export default Avatar;
