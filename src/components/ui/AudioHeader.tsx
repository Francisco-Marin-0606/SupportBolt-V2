import { getImageUrlFromSettings } from "@/app/services/audioDetailService";
import { AudioItem } from "@/app/types/audio";
import { AudioRequest } from "@/app/types/audioRequest";
import CopyText from "@/components/ui/CopyText";

interface AudioHeaderProps {
  audio: AudioItem | null;
  audioData: AudioRequest | null;
  isAccelerating: boolean;
  onAccelerate: () => void;
}

export const AudioHeader = ({ 
  audio, 
  audioData, 
  isAccelerating, 
  onAccelerate 
}: AudioHeaderProps) => {
  const imageUrl = getImageUrlFromSettings(audioData) || audio?.imageUrl || "";

  return (
    <div className="flex items-start gap-4">
      <div className="w-[100px] h-[100px] rounded-lg overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl || "/play.svg"}
            alt="Profile"
            className="w-[100px] h-[100px] object-cover"
          />
        )}
      </div>
      <div className="flex-1">
        {audio?.userLevel ? (
          <h1 className="text-2xl font-bold">
            Hipnosis nivel {audio?.userLevel}
          </h1>
        ) : (
          <h1 className="text-2xl font-bold">
            {audio?.title || "Sin título"}
          </h1>
        )}
        <CopyText
          text={`${audioData?._id}`}
          color="text-gray-500"
          className="cursor-pointer flex items-center gap-[5px] text-[14px] font-medium"
          iconClassName="w-[14px] h-[14px]"
        />
        <div className="flex flex-col gap-2">
          {audioData?.status === "completed" && (
            <button
              onClick={onAccelerate}
              disabled={isAccelerating}
              className={`px-2 my-3 w-[120px] text-bold bg-violet-200 rounded-md hover:bg-violet-50 flex items-center gap-2 ${
                isAccelerating ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isAccelerating ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
              {isAccelerating ? "Acelerando..." : "Acelerar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
