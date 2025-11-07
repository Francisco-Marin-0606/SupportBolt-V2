import { User } from "@/app/types/user";
import CopyText from "@/components/ui/CopyText";

interface UserInfoProps {
  user: User | null;
}

export const UserInfo = ({ user }: UserInfoProps) => {
  return (
    <div className="bg-white rounded-[20px] p-4 h-[100%] w-[300px]">
      <h2 className="text-[24px] font-bold mb-2">Usuario</h2>
      <div className="space-y-2">
        <div>
          <p className="text-gray-500">Nombre completo</p>
          <p className="font-bold">{user?.names || "Sin nombre"}</p>
        </div>
        <div>
          <p className="text-gray-500">Apodo</p>
          <p className="font-bold">{user?.wantToBeCalled || "Sin apodo"}</p>
        </div>
        <div>
          <p className="text-gray-500">Género</p>
          <p className="font-bold">{user?.gender || "Sin género"}</p>
        </div>
        <div>
          <p className="text-gray-500">Nacimiento</p>
          <p className="font-bold">
            {user?.birthdate
              ? user?.birthdate.split("T")[0]
              : "Sin nacimiento"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Email</p>
          <CopyText
            text={user?.email || "Sin email"}
            className="cursor-pointer flex items-center gap-[5px] font-bold"
            iconClassName="w-[14px] h-[14px]"
            color="text-black"
          />
        </div>
        <div>
          <p className="text-gray-500">Dispositivo</p>
          <p className="font-bold">{user?.device || "Sin dispositivo"}</p>
        </div>
        <div>
          <p className="text-gray-500">Idioma</p>
          <p className="font-bold">{user?.language || "Sin idioma"}</p>
        </div>
      </div>
    </div>
  );
};
