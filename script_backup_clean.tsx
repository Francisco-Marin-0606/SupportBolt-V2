'use client'

import { acceleratePublication, getAudioRequestById, getAudioRequestsByUserId, updateAudioRequest } from '@/app/_services/audioRequestService';
import { getAudiosByRequestId } from '@/app/_services/audioService';
import { findOne } from '@/app/_services/mmgUserService';
import { AudioItem, UnifiedAudioRequest } from '@/app/types/audio';
import { AudioRequest } from '@/app/types/audioRequest';
import { User } from '@/app/types/user';
import CopyText from '@/components/ui/CopyText';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/table/EmptyState';
import GridDataView, { Column } from '@/components/ui/table/GridDataView';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab = ({ label, isActive, onClick }: TabProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-bold ${isActive
      ? 'text-black border-b-2 border-black'
      : 'text-gray-500 hover:text-gray-700'
      }`}
  >
    {label}
  </button>
);

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Agregar la función para acelerar la publicación
const getMonthName = (month: number) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[month - 1];
};

export default function AudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const audioId = params.id as string;
  const [activeTab, setActiveTab] = useState('questions-answers');
  const [audioData, setAudioData] = useState<AudioRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [audio, setAudio] = useState<AudioItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [historyAudios, setHistoryAudios] = useState<UnifiedAudioRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showRetryHistory, setShowRetryHistory] = useState(false);

  // Obtención de datos
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const audioRequestData = await getAudioRequestById(audioId);
        if (audioRequestData) {
          setAudioData(audioRequestData);
          const audioItems = await getAudiosByRequestId(audioId);
          if (audioItems && audioItems.length > 0) {
            setAudio(audioItems[0]);
          }
          if (audioRequestData.userId) {
            const userData = await findOne(audioRequestData.userId);
            if (userData) {
              setUser(userData as unknown as User);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [audioId]);


  const ScriptSection = ({ script, time, index }: { script: string[], time: string, index: number }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedScript, setEditedScript] = useState<string[]>([]);

    // Inicializar el script editado cuando cambia el script original
    useEffect(() => {
      setEditedScript([...script]);
    }, [script]);

    // Función para manejar los cambios en los campos de texto
    const handleTextChange = (index: number, value: string) => {
      const newScript = [...editedScript];
      newScript[index] = value;
      setEditedScript(newScript);
    };

    const handleSave = async () => {
      try {
        if (audioData) {
          if (audioData?.audioMotive?.generatedSections?.[index]) {
            audioData.audioMotive.generatedSections[index].texts = editedScript;
          }
          const updatedAudio = await updateAudioRequest(audioId, audioData);
          setAudioData(updatedAudio);
        }
        setIsEditing(false);
      } catch (error) {
        console.error("Error al guardar los cambios:", error);
        alert("Error al guardar los cambios");
      }
    };


    const handelReprocess = async () => {
      try {
        if (audioData) {
          audioData.status = 'created';
          const updatedAudio = await updateAudioRequest(audioId, audioData);
          setAudioData(updatedAudio);
          alert("Audio re-procesado correctamente");
        }
      } catch (error) {
        console.error("Error al re-procesar:", error);
      }
    }

    return (
      <div className="bg-white rounded-[20px] p-8 mt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Personalización {index + 1}</h2>
            <p className="text-gray-500">{time}</p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-6 py-2 border-2 border-black rounded-lg font-medium"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Listo" : "Editar"}
            </button>
            {!isEditing && (
              <button className="px-6 py-2 bg-black text-white rounded-lg font-medium" onClick={handelReprocess}>
                Re-Procesar
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {script.length > 0 ? (
            editedScript.map((line, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="text-gray-400 font-medium">{idx + 1}</span>
                {isEditing ? (
                  <textarea
                    value={line}
                    onChange={(e) => handleTextChange(idx, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    rows={2}
                  />
                ) : (
                  <p className="text-gray-600">{line}</p>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="No hay texto disponible"
              description="No se ha generado el guión de hipnosis o no hay texto para mostrar."
            />
          )}
        </div>
      </div>
    );
  };



  // Función para cargar el historial
  const fetchHistory = async () => {
    if (!user?._id) return;

    try {
      setLoadingHistory(true);
      const audios = await getAudioRequestsByUserId(user._id as string);
      // Filtrar el audio actual
      const filteredAudios = (audios.filter(audio => audio._id !== audioId)) as unknown as AudioRequest[];
      filteredAudios.sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime());
      const combinedData = await Promise.all(
        filteredAudios.map(async (request: AudioRequest) => {
          try {
            const audioData = await getAudiosByRequestId(request._id as string);
            const first = audioData?.[0] || {};
            return {
              ...request,
              id: request._id,
              audioUrl: first.audioUrl || '',
              audioUrlPlay: first.audioUrl || '',
              imageUrl: first.imageUrl,
              title: first.title || '',
              formattedDuration: first.formattedDuration,
              customData: first.customData || {}
            } as UnifiedAudioRequest;
          } catch (error) {
            console.error('Error obteniendo datos de audio:', error);
            return null;
          }
        })
      );

      setHistoryAudios(combinedData.filter(Boolean) as UnifiedAudioRequest[]);

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cargar historial cuando se cambia a la pestaña
  useEffect(() => {
    if (activeTab === 'history' && user?._id) {
      fetchHistory();
    }
  }, [activeTab, user?._id]);

  const tabs = [
    { id: 'questions-answers', label: 'Preguntas y respuestas' },
    { id: 'script', label: 'Guión' },
    { id: 'errors', label: 'Errores' },
    { id: 'history', label: 'Historial de Hipnosis' }
  ];

  // Definir las columnas para el GridDataView
  const columns: Column<UnifiedAudioRequest>[] = [
    {
      field: 'status',
      header: 'STATUS',
      render: (value) => (
        <StatusBadge status={value as string} />
      )
    },
    {
      field: 'settings',
      header: 'NIVEL',
      render: (value, row) => {
        if (row.level && typeof row.level === 'string') {
          return <div className="font-medium">Nivel {row.level}</div>;
        }
        return <div className="font-medium">Sin nivel</div>;
      }
    },
    {
      field: 'requestDate',
      header: 'FECHA DE PEDIDO',
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="font-[16px] font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px]"
          color="text-black"
        />
      )
    },
    {
      field: 'publicationDate',
      header: 'FECHA DE ENTREGA',
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="font-[16px] font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px]"
          color="text-black"
        />
      )
    },
    {
      field: 'audioUrlPlay',
      header: 'AUDIO',
      render: (value, row) => {
        if (value && typeof value === 'string' && value !== "") {
          return (
            <div className="h-[40px] w-[300px] rounded-[30px] bg-gray-100 flex items-center mx-auto" onClick={(e) => e.stopPropagation()}>
              <AudioPlayer
                src={value as string}
                showJumpControls={false}
                showFilledVolume={false}
                autoPlayAfterSrcChange={false}
                autoPlay={false}
                layout="horizontal-reverse"
                customControlsSection={[
                  RHAP_UI.MAIN_CONTROLS,
                  RHAP_UI.PROGRESS_BAR
                ]}
                customProgressBarSection={[
                  RHAP_UI.CURRENT_TIME,
                  <div key="separator" className="mx-1">/</div>,
                  RHAP_UI.DURATION,
                  RHAP_UI.VOLUME_CONTROLS
                ]}
                customIcons={{
                  play: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ),
                  pause: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ),
                  volume: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  ),
                  volumeMute: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                    </svg>
                  )
                }}
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                }}
                className="audio-player-custom"
              />
            </div>
          )
        } else {
          return <div className="" onClick={(e) => e.stopPropagation()}>
            <div className="text-gray-500 text-sm">Sin audio</div>
          </div>
        }
      }
    },
    {
      field: 'audioUrl',
      header: 'URL',
      render: (value) => (
        <button
          className="text-blue-500 hover:text-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            if (value && typeof value === 'string') {
              navigator.clipboard.writeText(value as string || 'https://mentalmagnet.com');
            }
          }}
        >
          Copiar URL
        </button>
      )
    }
  ];

  const formatDateUTC = (dateString: string | undefined): string => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return `${date.getUTCDate()} ${MONTHS_ES[date.getUTCMonth()]} ${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  };
  const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];


  // Preparar los datos para el grid
  const gridData = audioData ? [{
    ...audioData,
    audioUrl: audio?.audioUrl || '',
    audioUrlPlay: audio?.audioUrl || '',
    imageUrl: audio?.imageUrl || ''
  }] : [];

  // Columnas para el historial
  const historyColumns: Column<UnifiedAudioRequest>[] = [
    {
      field: 'audioMotive',
      header: 'NOMBRE',
      render: (value, row) => (
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
          <div className="w-8 h-8 rounded-md overflow-hidden">
            {row.imageUrl && (
              <img
                src={row.imageUrl || '/play.svg'}
                alt="Audio thumbnail"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <div className="font-bold text-[16px] text-left">{row.title || '-'}</div>
            <CopyText
              text={`ID: ${row.id}`}
              className="cursor-pointer flex items-center gap-[5px] text-[12px] font-medium text-left"
              iconClassName="w-[12px] h-[12px]"
              color="text-gray-500"
            />
          </div>
        </div>
      )
    },
    {
      field: 'status',
      header: 'STATUS',
      render: (value) => (
        <StatusBadge status={value as string} />
      )
    },
    {
      field: 'settings',
      header: 'NIVEL',
      render: (value, row) => {
        if (row.level && typeof row.level === 'string') {
          return <div className="font-medium">Nivel {row.level}</div>;
        }
        return <div className="font-medium">Sin nivel</div>;
      }
    },
    {
      field: 'requestDate',
      header: 'FECHA DE PEDIDO',
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="font-[16px] font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px]"
          color="text-black"
        />
      )
    },
    {
      field: 'publicationDate',
      header: 'FECHA DE ENTREGA',
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="font-[16px] font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px] text-black"
        />
      )
    },

    {
      field: 'audioUrlPlay',
      header: 'AUDIO',
      render: (value) => {
        if (value && typeof value === 'string' && value !== "") {
          return (
            <div className="h-[40px] w-[300px] rounded-[30px] bg-gray-100 flex items-center mx-auto" onClick={(e) => e.stopPropagation()}>
              <AudioPlayer
                src={value as string}
                showJumpControls={false}
                showFilledVolume={false}
                autoPlayAfterSrcChange={false}
                autoPlay={false}
                layout="horizontal-reverse"
                customControlsSection={[
                  RHAP_UI.MAIN_CONTROLS,
                  RHAP_UI.PROGRESS_BAR
                ]}
                customProgressBarSection={[
                  RHAP_UI.CURRENT_TIME,
                  <div key="separator" className="mx-1">/</div>,
                  RHAP_UI.DURATION,
                  RHAP_UI.VOLUME_CONTROLS
                ]}
                customIcons={{
                  play: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ),
                  pause: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ),
                  volume: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  ),
                  volumeMute: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                    </svg>
                  )
                }}
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                }}
                className="audio-player-custom"
              />
            </div>
          )
        } else {
          return <div className="" onClick={(e) => e.stopPropagation()}>
            <div className="text-gray-500 text-sm">Sin audio</div>
          </div>
        }
      }
    },
    {
      field: 'audioUrl',
      header: 'URL',
      render: (value) => (
        <button
          className="text-blue-500 hover:text-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            if (value && typeof value === 'string') {
              navigator.clipboard.writeText(value as string || 'https://mentalmagnet.com');
            }
          }}
        >
          Copiar URL
        </button>
      )
    }
  ];

  // Preparar los datos para el grid
  const historyData = historyAudios.map(audio => ({
    ...audio,
    audioUrl: audio.audioUrl
  }));

  const handleHistoryNewTab = (item: UnifiedAudioRequest) => {
    window.open(window.location.href.split('/').slice(0, -1).join('/') + `/${item.id || item._id}`, '_blank');
  };

  const handleAccelerate = async () => {
    try {
      setIsAccelerating(true);
      setMessage(null);

      // Forzar el tipo de la respuesta
      const result = await acceleratePublication(audioId);
      setMessage({
        type: 'success',
        text: "Publicación acelerada con éxito"
      });

      // Recargar los datos del audio
      const audioRequestData = await getAudioRequestById(audioId);
      if (audioRequestData) {
        setAudioData(audioRequestData);
      }

    } catch (error) {
      console.error('Error al acelerar la publicación:', error);
      setMessage({ type: 'error', text: 'Error al acelerar la publicación' });
    } finally {
      setIsAccelerating(false);
      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleHistoryRowClick = (row: UnifiedAudioRequest) => {
    router.push(`/audio/${row.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!audioData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Audio no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Botón Volver */}
      <div className="px-1 mb-1">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver
        </button>
      </div>

      <div className="flex gap-4 mt-4">
        {/* Sección Principal (90%) */}
        <div className="items-start flex-col w-[100%]">
          {/* Encabezado con imagen y datos */}
          <div className="flex items-start gap-4">
            <div className="w-[100px] h-[100px] rounded-lg overflow-hidden">
              {audio?.imageUrl && (
                <img
                  src={audio?.imageUrl as string || '/play.svg'}
                  alt="Profile"
                  className="w-[100px] h-[100px] object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{audio?.title || 'Sin título'}</h1>
              <CopyText
                text={`ID: ${audioData?._id}`}
                color="text-gray-500"
                className="cursor-pointer flex items-center gap-[5px] text-[14px] font-medium"
                iconClassName="w-[14px] h-[14px]"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAccelerate}
                  disabled={isAccelerating}
                  className={`px-2 my-3 w-[120px] text-bold bg-violet-200 border border-violet-500 rounded-md hover:bg-violet-50 flex items-center gap-2 ${isAccelerating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  {isAccelerating ? 'Acelerando...' : 'Acelerar'}
                </button>
                {message && (
                  <div
                    className={`w-[300px] text-sm px-2 py-1 rounded ${message.type === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-col mt-6 items-center">
            <label className="text-lg font-bold">Información</label>
            <div className="flex gap-4 bg-black h-[2px] w-[100px]" />
          </div>

          {/* Contenido principal usando GridDataView */}
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-[20px] overflow-hidden p-1">
              <GridDataView
                data={gridData}
                columns={columns}
                showSearch={false}
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Sección Lateral - I-nformación del Usuario (20%) */}
        <div className="bg-white rounded-[20px] p-4 h-[100%] w-[300px]">
          <h2 className="text-[24px] font-bold mb-2">Usuario</h2>
          <div className="space-y-2">
            <div>
              <p className="text-gray-500">Nombre completo</p>
              <p className="font-bold">{user?.names || 'Sin nombre'}</p>
            </div>
            <div>
              <p className="text-gray-500">Apodo</p>
              <p className="font-bold">{user?.wantToBeCalled || 'Sin apodo'}</p>
            </div>
            <div>
              <p className="text-gray-500">Género</p>
              <p className="font-bold">{user?.gender || 'Sin género'}</p>
            </div>
            <div>
              <p className="text-gray-500">Nacimiento</p>
              <p className="font-bold">{user?.birthdate ? user?.birthdate.split('T')[0] : 'Sin nacimiento'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <CopyText
                text={user?.email || 'Sin email'}
                className="cursor-pointer flex items-center gap-[5px] font-bold"
                iconClassName="w-[14px] h-[14px]"
                color="text-black"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="border-b border-gray-200 mt-10">
        <div className="flex gap-">
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Formulario */}
      {activeTab === 'questions-answers' && (
        <div className="bg-white rounded-[20px] p-6 mt-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{audioData?.additionalData?.formName || audioData?.settings?.month ? `Formulario ${getMonthName(Number(audioData?.settings?.month ?? 0))}  ${audioData?.settings?.year}` : 'Sin formulario'}</h2>
            <div className="space-x-3">
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                Editar
              </button>
              <button className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800">
                Re-crear guión
              </button>
            </div>
          </div>
          <div className="grid grid-cols gap-4">
            {audioData?.audioMotive?.questions.map((question, index) => (
              <div key={index} className='mb-10' >
                <p className="text-lg font-bold">{index + 1}. {question.question}</p>
                <p className="text-lg text-gray-600 font-medium">{question.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {
        activeTab === 'script' && (
          <div className="mt-6 flex flex-col gap-4">
            {
              audioData?.audioMotive?.generatedSections && audioData?.audioMotive?.generatedSections.length > 0 && audioData?.settings?.exportSettings?.sectionsSettings && audioData?.settings?.exportSettings?.sectionsSettings.length > 0 ? (
                audioData?.audioMotive?.generatedSections?.map((section, index) => (
                  <ScriptSection
                    key={index}
                    script={section.texts}
                    time={`${formatTime(audioData?.settings?.exportSettings?.sectionsSettings[index].startTime || 0)} - ${formatTime(audioData?.settings?.exportSettings?.sectionsSettings[index].endTime || 0)}`}
                    index={index}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] bg-white rounded-[20px] p-8">
                  <svg
                    className="w-12 h-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium text-center">
                    No se ha generado el guión de hipnosis
                  </p>
                  <p className="text-gray-400 text-sm mt-2 text-center">
                    El guión aparecerá aquí una vez que se procese la solicitud
                  </p>
                </div>
              )
            }
          </div>
        )
      }
      {

        activeTab === 'errors' && (
          <div className="mt-6 flex flex-col gap-6">
            {audioData?.errorStatus ? (
              <>
                {audioData.errorStatus.map((error, index) => {
                  // Intentar parsear el mensaje de error si es un JSON
                  let statusCode = null;
                  let detailMessage = null;

                  try {
                    // Verificar si contiene un JSON dentro del texto
                    if (typeof error.message === 'string' && error.message.includes('{"detail":')) {
                      // Extraer el JSON de la cadena de texto
                      const jsonMatch = error.message.match(/\{.*\}/);
                      if (jsonMatch) {
                        const jsonStr = jsonMatch[0];
                        const jsonData = JSON.parse(jsonStr);

                        // Extraer información relevante
                        if (jsonData.detail) {
                          statusCode = jsonData.detail.status;
                          detailMessage = jsonData.detail.message;
                        }
                      }

                      // Extraer el código de estado si está presente
                      const statusMatch = error.message.match(/Status: (\d+)/);
                      if (statusMatch && !statusCode) {
                        statusCode = statusMatch[1];
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing error message:', e);
                  }

                  // Verificar si el mensaje de error contiene información de guión y transcripción
                  const hasScriptInfo =
                    typeof error.message === 'string' &&
                    (error.message.includes('Guion original') ||
                      error.message.includes('Transcripcion') ||
                      error.message.includes('Audio N°'));

                  // Si hay información de script, formatear según el ejemplo solicitado
                  if (hasScriptInfo) {
                    // Dividir el mensaje en líneas
                    const lines = error.message.split("--------------------------------------------")[0].toString().split('\n');
                    // Extraer información de cada línea

                    // Array para almacenar cada bloque de audio
                    const audioInfoBlocks: {
                      audioNumber: string;
                      originalScript: string;
                      transcription: string;
                    }[] = [];

                    let currentBlock = {
                      audioNumber: '',
                      originalScript: '',
                      transcription: ''
                    };

                    // Procesar líneas para extraer información
                    lines.forEach(line => {
                      line = line.trim();

                      if (line.startsWith('Audio N°')) {
                        // Si ya tenemos información de un bloque, guardarlo y crear uno nuevo
                        if (currentBlock.audioNumber) {
                          audioInfoBlocks.push({ ...currentBlock });
                        }
                        currentBlock = {
                          audioNumber: line,
                          originalScript: '',
                          transcription: ''
                        };
                      } else if (line.includes('Guion original') || line.includes("'Guion original'")) {
                        const scriptParts = line.split(':');
                        if (scriptParts.length > 1) {
                          currentBlock.originalScript = scriptParts.slice(1).join(':').trim();
                        }
                      } else if (line.includes('Transcripcion')) {
                        const transcriptionParts = line.split(':');
                        if (transcriptionParts.length > 1) {
                          currentBlock.transcription = transcriptionParts.slice(1).join(':').trim();
                        }
                      }
                    });

                    // Añadir el último bloque si tiene información
                    if (currentBlock.audioNumber && !audioInfoBlocks.find(block => block.audioNumber === currentBlock.audioNumber)) {
                      audioInfoBlocks.push(currentBlock);
                    }

                    // Verificar si hay información sobre resultados de reintentos
                    const resultadoIndex = lines.findIndex(line => line.includes('Resultado de reintentos'));
                    const resultadoLines = resultadoIndex !== -1 ? lines.slice(resultadoIndex + 1) : [];
                    const resultados = resultadoLines
                      .filter(line => line.trim() !== '' && line.includes('Audio N°'))
                      .map(line => line.trim());


                    return (
                      <div key={index} className="bg-white p-8 rounded-[20px]">

                        <div className="space-y-6">
                          {audioInfoBlocks.length > 0 ? (
                            <div className="space-y-4">
                              <span className="font-bold text-[20px]">{error.action}</span>
                              {audioInfoBlocks.map((block, blockIndex) =>

                                block.transcription.length > 0 && block.originalScript.length > 0 ? (
                                  <div key={blockIndex} className="border-l-4 border-gray-200 pl-4 p-2 space-y-2">
                                    <p className="font-bold text-[20px]">{block.audioNumber}</p>
                                    <p className="pt-2"><span className="font-bold">Guion original:</span> {block.originalScript}</p>
                                    <p className="pt-2"><span className="font-bold">Transcripción:</span> {block.transcription}</p>
                                  </div>
                                ) : (<div></div>)
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-md">
                              <h4 className="text-gray-700 font-bold mb-2">Mensaje de error:</h4>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap">{error.message}</pre>
                              </div>
                            </div>
                          )}
                          {resultados.length > 0 && (
                            <div className="mt-6">
                              <p className="font-bold mb-2">Resultado de reintentos:</p>
                              <div className="space-y-1">
                                {resultados.map((resultado, resultadoIndex) => {
                                  const parts = resultado.split('-');
                                  if (parts.length >= 2) {
                                    const audioNum = parts[0].trim();
                                    const result = parts[1].trim();
                                    return (
                                      <p key={resultadoIndex}>
                                        {audioNum} - <span className="font-bold">{result}</span>
                                      </p>
                                    );
                                  }
                                  return <p key={resultadoIndex}>{resultado}</p>;
                                })}
                              </div>
                            </div>
                          )}
                          {statusCode && (
                            <div className="bg-red-50 p-4 rounded-md border border-red-100">
                              <h4 className="text-red-800 font-medium mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Código de error: {statusCode}
                              </h4>
                            </div>
                          )}
                          {detailMessage && (
                            <div className="bg-gray-50 p-4 rounded-md">
                              <h4 className="text-gray-700 font-bold mb-4">Mensaje del sistema:</h4>
                              <p className="text-gray-800 bg-white p-3 rounded border border-gray-200">{detailMessage}</p>
                            </div>
                          )}
                          {error.source && (
                          <div>
                            <h4 className="text-gray-700 font-bold mb-2 mt-6">Origen del error:</h4>
                            <p className="text-gray-800 bg-white p-3 rounded border border-gray-200">{error.source}</p>
                          </div>
                        )}
                        </div>
                        
                      </div>
                    );
                  } else {
                    // Mostrar el formato de error normal para otros tipos de errores
                    return (
                      <div key={index} className="bg-white p-6 rounded-[20px]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold mb-4 flex items-center">
                            {error.action}
                          </h3>

                        </div>

                        <div className="space-y-6">
                          {statusCode && (
                            <div className="bg-red-50 p-4 rounded-md border border-red-100">
                              <h4 className="text-red-800 font-medium mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Código de error: {statusCode}
                              </h4>
                            </div>
                          )}

                          {detailMessage && (
                            <div className="bg-gray-50 p-4 rounded-md">
                              <h4 className="text-gray-700 font-bold mb-4">Mensaje del sistema:</h4>
                              <p className="text-gray-800 bg-white p-3 rounded border border-gray-200">{detailMessage}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="text-gray-700 font-bold mb-4">Mensaje de error completo:</h4>
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-auto max-h-[200px]">
                              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{error.message}</pre>
                            </div>
                          </div>

                          {error.source && (
                            <div>
                              <h4 className="text-gray-700 font-bold mb-4">Origen del error:</h4>
                              <p className="text-gray-800 bg-white p-3 rounded border border-gray-200">{error.source}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </>
            ) : (
              <EmptyState
                title="No hay errores disponibles"
                description="Los errores aparecerán aquí cuando se detecten durante el procesamiento."
              />
            )}
          </div>
        )
      }
      {
        activeTab === 'history' && (
          <div className="mt-6">
            <div className="bg-white rounded-[20px] overflow-hidden">
              {loadingHistory ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-gray-500">Cargando historial...</div>
                </div>
              ) : historyAudios.length > 0 ? (
                <GridDataView
                  data={historyAudios}
                  columns={historyColumns}
                  showSearch={false}
                  isLoading={loadingHistory}
                  onRowClick={handleHistoryRowClick}
                  onNewTab={handleHistoryNewTab}
                />
              ) : (
                <EmptyState
                  title="No hay historial de hipnosis"
                  description="Este usuario no tiene otras sesiones de hipnosis registradas."
                />
              )}
            </div>
          </div>
        )
      }


      {/* Estilos del reproductor de audio */}
      <style jsx global>{`
         .audio-player-custom .rhap_container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          min-width: auto;
          width: 100%;
        }
        .audio-player-custom .rhap_main-controls-button {
          color: #374151;
          transition: color 0.2s;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audio-player-custom .rhap_main-controls-button:hover {
          color: #1a56db;
        }
        .audio-player-custom .rhap_progress-filled {
          background-color: #1a56db;
        }
        .audio-player-custom .rhap_progress-indicator {
          display: none;
        }
        .audio-player-custom .rhap_volume-button {
          color: #374151;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audio-player-custom .rhap_volume-indicator {
          display: none;
        }
        .audio-player-custom .rhap_progress-bar {
          background: #e5e7eb;
          height: 4px;
          border-radius: 2px;
        }
        .audio-player-custom .rhap_progress-bar-show-download {
          background-color: transparent;
        }
        .audio-player-custom .rhap_time {
          color: #374151;
          font-size: 0.75rem;
        }
        .audio-player-custom .rhap_volume-controls {
          justify-content: flex-end;
          margin-left: 10px;
        }
        .audio-player-custom .rhap_volume-bar {
          display: none;
        }
        .audio-player-custom .rhap_main {
          flex: 0;
        }
        .audio-player-custom .rhap_progress-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .audio-player-custom .rhap_total-time {
          margin-left: 0;
        }
        .audio-player-custom .rhap_current-time {
          margin-right: 0;
        }
        .audio-player-custom .rhap_controls-section {
          margin: 0;
        }
        .audio-player-custom .rhap_additional-controls {
          display: none;
        }
        .audio-player-custom .rhap_play-pause-button {
          font-size: 24px;
        }
        .audio-player-custom .rhap_progress-container {
          flex: 1;
        }
        .audio-player-custom .rhap_main-controls {
          margin-right: 8px;
        }
      `}</style>

      {showRetryHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historial de intentos</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowRetryHistory(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="font-bold mb-2">Se ha llegado al límite de intentos</p>
              <div className="space-y-4">
                <div>
                  <p className="font-bold">Audio N°4 - intento 1</p>
                  <p><span className="font-bold">Guion original:</span> el sol ilumina el techo de tejas terracota y los balcones de madera pulida creando un ambiente cálido y acogedor</p>
                  <p><span className="font-bold">Transcripción:</span> el sol ilumina el techo de texas terracota y los balcones de madera pulida creando un ambiente cálido y acogedor</p>
                </div>

                <div>
                  <p className="font-bold">Audio N°4 - intento 1</p>
                  <p><span className="font-bold">Guion original:</span> esta sensación de calma se expande al visualizar a tu pareja tu cómplice y sostén diario quien yéna tus días de alegría y afecto su compañía ilumina tu vida</p>
                  <p><span className="font-bold">Transcripción:</span> esta sensación de calma se expande al visualizar a tu pareja tu cómplice y sostendiario quien llena tus días de alegría y afecto su compañía ilumina tu vida</p>
                </div>

                <div>
                  <p className="font-bold">Audio N°5 - intento 1</p>
                  <p><span className="font-bold">Guion original:</span> annie deja que este sentimiento se absorba en tu cuerpo vibrando con amor y calma</p>
                  <p><span className="font-bold">Transcripción:</span> ani deja que este sentimiento se absorba en tu cuerpo vibrando con amor y calma</p>
                </div>

                <div>
                  <p className="font-bold">Audio N°55 - intento 1</p>
                  <p><span className="font-bold">Guion original:</span> ¿qué decisiones toma esta nueva annie que actúa desde una plenitud profunda?</p>
                  <p><span className="font-bold">Transcripción:</span> ¿qué decisiones toma esta nueva ani que actúa desde una plenitud profunda?</p>
                </div>

                <div>
                  <p className="font-bold">Audio N°59 - intento 1</p>
                  <p><span className="font-bold">Guion original:</span> annie tu dedicación y amor por ti misma y por los demás te han llevado hasta aquí</p>
                  <p><span className="font-bold">Transcripción:</span> ani tu dedicación y amor por ti misma y por los demás te han llevado hasta aquí</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="font-bold mb-2">Resultado de reintentos:</p>
              <div className="space-y-1">
                <p>Audio N°4 - <span className="font-bold">NO</span></p>
                <p>Audio N°4 - <span className="font-bold">SI</span></p>
                <p>Audio N°5 - <span className="font-bold">SI</span></p>
                <p>Audio N°55 - <span className="font-bold">SI</span></p>
                <p>Audio N°59 - <span className="font-bold">SI</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}