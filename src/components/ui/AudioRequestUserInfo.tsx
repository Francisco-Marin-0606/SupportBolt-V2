import { AudioRequest } from "@/app/types/audioRequest";
import CopyText from "@/components/ui/CopyText";

interface AudioRequestUserInfoProps {
  audioData: AudioRequest | null;
}

export const AudioRequestUserInfo = ({ audioData }: AudioRequestUserInfoProps) => {
  const userData = audioData?.userData;

  if (!userData) {
    return (
      <div className="bg-white rounded-[20px] p-4 h-fit">
        <h2 className="text-[24px] font-bold mb-2">Datos del Usuario</h2>
        <p className="text-gray-500">No hay datos de usuario disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] p-4 h-fit">
      <h2 className="text-[24px] font-bold mb-2">Datos del Usuario</h2>
      <div className="space-y-2">
        <div>
          <p className="text-gray-500">Nombre completo</p>
          <p className="font-bold">{userData.names || "Sin nombre"} {userData.lastnames || ""}</p>
        </div>
        <div>
          <p className="text-gray-500">Apodo</p>
          <p className="font-bold">{userData.wantToBeCalled || "Sin apodo"}</p>
        </div>
        <div>
          <p className="text-gray-500">Género</p>
          <p className="font-bold">{userData.gender || "Sin género"}</p>
        </div>
        <div>
          <p className="text-gray-500">Nacimiento</p>
          <p className="font-bold">
            {userData.birthdate
              ? userData.birthdate.split("T")[0]
              : "Sin nacimiento"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Email</p>
          <CopyText
            text={userData.email || "Sin email"}
            className="cursor-pointer flex items-center gap-[5px] font-bold"
            iconClassName="w-[14px] h-[14px]"
            color="text-black"
          />
        </div>
        <div>
          <p className="text-gray-500">ID Usuario</p>
          <CopyText
            text={userData._id || "Sin ID"}
            className="cursor-pointer flex items-center gap-[5px] font-bold"
            iconClassName="w-[14px] h-[14px]"
            color="text-black"
          />
        </div>
        <div>
          <p className="text-gray-500">Idioma</p>
          <p className="font-bold">
            {userData.language === "es" ? "Español" : userData.language === "en" ? "Inglés" : "Sin idioma"}
          </p>
        </div>
      </div>
    </div>
  );
};
