import { AudioItem } from "@/app/types/audio";
import { AudioRequest } from "@/app/types/audioRequest";

interface QuestionsAnswersProps {
  audioData: AudioRequest;
  audio: AudioItem | null;
}

export const QuestionsAnswers = ({ audioData, audio }: QuestionsAnswersProps) => {
  const getFormName = () => {
    if (audioData?.additionalData?.formName) {
      return audioData.additionalData.formName;
    }
    
    if (audio?.userLevel) {
      return `Formulario nivel ${audio.userLevel}`;
    }
    
    const userLevel = (audioData?.settings as any)?.userLevel || 
                      audioData?.level || 
                      "desconocido";
    return `Formulario nivel ${userLevel}`;
  };

  return (
    <div className="bg-white rounded-[20px] p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{getFormName()}</h2>
      </div>
      <div className="grid grid-cols gap-4">
        {audioData?.audioMotive?.questions.map((question, index) => (
          <div key={index} className="mb-10">
            <p className="text-lg font-bold">
              {index + 1}. {question.question}
            </p>
            <p className="text-lg text-gray-600 font-medium">
              {question.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
