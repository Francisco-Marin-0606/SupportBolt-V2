"use client";

import { getAudioRequestsByUserId } from "@/app/_services/audioRequestService";
import { getAudiosByRequestId } from "@/app/_services/audioService";
import { Connection } from "@/app/_services/connectionService";
import {
  createMembership,
  getMembershipsByUser,
  membershipService,
} from "@/app/_services/membershipService";
import { cancelNextHypnosis, findOne, isTrialUser, updateEmail, updateMmgUser } from "@/app/_services/mmgUserService";
import { addMonths, addYears } from "@/app/utils/utils";
import Loading from "@/components/loading/Loading";
import { Modal } from "@/components/modal/Modal";
import CopyText from "@/components/ui/CopyText";
import GridDataView, { Column } from "@/components/ui/table/GridDataView";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

// Tipos
import { UnifiedAudioRequest } from "@/app/types/audio";
import { Membership } from "@/app/types/membership";
import { Payment } from "@/app/types/payment";
import { User } from "@/app/types/user";
import Alert from "@/components/alert/Alert";
import StatusBadge from "@/components/ui/StatusBadge";

type FormDataState = Record<string, string>;
type TabType = "hipnosis" | "pagos";

// Constantes
const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const formatDateUTC = (dateString: string | undefined): string => {
  if (!dateString) return "Sin fecha";
  const date = new Date(dateString);
  return `${date.getUTCDate()} ${
    MONTHS_ES[date.getUTCMonth()]
  } ${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(
    2,
    "0"
  )}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};

// Funciones auxiliares
const getMembershipStatus = (
  lastMembership:
    | {
        membershipId: string;
        membershipDate: string;
        membershipPaymentDate: string;
        type: string;
      }
    | undefined
): string => {
  if (!lastMembership?.membershipId) return "Cancelada";

  if (!lastMembership.type) {
    return "Cancelada";
  }

  const normalizedType = lastMembership.type.toLowerCase();
  const currentDate = new Date();

  switch (normalizedType) {
    case "monthly": {
      const membershipDate = new Date(lastMembership.membershipDate);
      const expirationDate = addMonths(membershipDate, 1);
      return expirationDate >= currentDate ? "Activa" : "Cancelada";
    }
    case "yearly": {
      const membershipDate = new Date(lastMembership.membershipDate);
      const expirationDate = addYears(membershipDate, 1);
      return expirationDate >= currentDate ? "Activa" : "Cancelada";
    }
    case "free":
      return "Activa"; // Free siempre activo
    case "trial":
      return "Trial";
    default:
      return "pito";
  }
};

const getSubscriptionType = (type: string, membershipDate?: string): string => {
  switch (type) {
    case "monthly":
      return "Mensual";
    case "yearly":
      return "Anual";
    case "free":
      return "Free";
    case "trial":
      return "Trial";
    default:
      return "Mensual";
  }
};

// Datos de muestra para pagos (en un entorno real estos deberían venir de una API)
const getSamplePaymentData = (userId: string): Payment[] => [
  {
    id: "1",
    userId,
    orderId: "ord_123",
    amount: 1500,
    currency: "mxn",
    status: "completed",
    paymentMethod: "card",
    transactionId: "tx_abc123",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    userId,
    orderId: "ord_456",
    amount: 2000,
    currency: "mxn",
    status: "pending",
    paymentMethod: "card",
    transactionId: "tx_def456",
    createdAt: "2024-01-10T15:45:00Z",
    updatedAt: "2024-01-10T15:45:00Z",
  },
  {
    id: "3",
    userId,
    orderId: "ord_789",
    amount: 1000,
    currency: "mxn",
    status: "failed",
    paymentMethod: "card",
    transactionId: "tx_ghi789",
    createdAt: "2024-01-05T09:15:00Z",
    updatedAt: "2024-01-05T09:15:00Z",
  },
];

export default function UserPage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();

  // Estados
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isCreatingMembership, setIsCreatingMembership] = useState(false);
  const [createMembershipError, setCreateMembershipError] = useState<
    string | null
  >(null);
  const [updatingUpset, setUpdatingUpset] = useState(false);

  const [updatingGender, setUpdatingGender] = useState(false);
  // Estados para edición inline del apodo (wantToBeCalled)
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [updatingNickname, setUpdatingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState<string>("");
  
  // Estados para edición inline del género con texto
  const [isEditingGenderText, setIsEditingGenderText] = useState(false);
  const [genderDraft, setGenderDraft] = useState<string>("");

  // Estados para edición inline de la fecha de nacimiento
  const [isEditingBirthdate, setIsEditingBirthdate] = useState(false);
  const [updatingBirthdate, setUpdatingBirthdate] = useState(false);
  const [birthdateDraft, setBirthdateDraft] = useState<string>("");

  // Estados para pestañas
  const [activeTab, setActiveTab] = useState<TabType>("hipnosis");
  const [hipnosisHistory, setHipnosisHistory] = useState<UnifiedAudioRequest[]>(
    []
  );
  const [paymentHistory, setPaymentHistory] = useState<Membership[]>([]);
  const [loadingHipnosis, setLoadingHipnosis] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Estados para la membresía
  const [membershipType, setMembershipType] = useState<string>("Mensual");
  const [membershipAmount, setMembershipAmount] = useState<string>("20");
  const [membershipCurrency, setMembershipCurrency] = useState<string>("MXN");
  const [membershipProcessor, setMembershipProcessor] =
    useState<string>("RevenueCat");
  const [membershipAudios, setMembershipAudios] = useState<string>("1");
  const [membershipDate, setMembershipDate] = useState<string>("");

  // Estados para el modal de cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState(false);

  // Estados para cancelar próxima hipnosis
  const [showCancelHypnosisModal, setShowCancelHypnosisModal] = useState(false);
  const [cancellingHypnosis, setCancellingHypnosis] = useState(false);

  // Estados para el modal de confirmación del upsell
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // Estados para el código de soporte
  const [supportCode, setSupportCode] = useState<string | null>(null);
  const [loadingSupportCode, setLoadingSupportCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  // Estados para revocar tokens
  const [showRevokeTokensModal, setShowRevokeTokensModal] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [revokingTokens, setRevokingTokens] = useState(false);


  // Efectos
  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Sincronizar draft del apodo cuando cambia el usuario cargado
  useEffect(() => {
    setNicknameDraft(user?.wantToBeCalled || "");
  }, [user?.wantToBeCalled]);

  // Sincronizar draft del género cuando cambia el usuario cargado
  useEffect(() => {
    setGenderDraft(user?.gender || "");
  }, [user?.gender]);

  // Sincronizar draft de la fecha de nacimiento cuando cambia el usuario cargado
  useEffect(() => {
    setBirthdateDraft(user?.birthdate?.split("T")[0] || "");
  }, [user?.birthdate]);

  // Efecto para manejar el temporizador de cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnCooldown && cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setIsOnCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnCooldown, cooldownTime]);

  useEffect(() => {
    if (userId) {
      fetchGridData(activeTab);
    }
  }, [userId, activeTab]);

  // Obtención de datos
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userData = await findOne(userId);
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGridData = async (tab: TabType) => {
    try {
      if (tab === "hipnosis") {
        setHipnosisHistory([]);
        setLoadingHipnosis(true);
        const audioRequestData = await getAudioRequestsByUserId(userId);
        // Combinar datos de AudioRequest con Audio
        const combinedData = await Promise.all(
          audioRequestData.map(async (request) => {
            try {
              const audioData = await getAudiosByRequestId(
                request._id as string
              );

              return {
                ...request,
                formattedDuration: audioData[0]?.formattedDuration,
                title: audioData[0]?.title,
                customData: audioData[0]?.customData,
                audioUrl: audioData[0]?.audioUrl,
                audioUrlPlay: audioData[0]?.audioUrl,
                imageUrl: audioData[0]?.imageUrl,
              } as UnifiedAudioRequest;
            } catch (error) {
              console.error("Error obteniendo datos de audio:", error);
              return request as UnifiedAudioRequest;
            }
          })
        );

        setHipnosisHistory(combinedData);
        setLoadingHipnosis(false);
      } else {
        setPaymentHistory([]);
        setLoadingPayments(true);
        const paymentData = await getMembershipsByUser(userId);
        setPaymentHistory(paymentData as unknown as Membership[]);
        setLoadingPayments(false);
      }
    } catch (error) {
      console.error(`Error fetching ${tab} data:`, error);
      if (tab === "hipnosis") {
        setHipnosisHistory([]);
        setLoadingHipnosis(false);
      } else {
        setPaymentHistory([]);
        setLoadingPayments(false);
      }
    }
  };

  // Manejadores de eventos
  const handleSubmit = async (values: FormDataState) => {
    try {
      setIsModalOpen(false);
      setLoading(true);
      await updateEmail(userId, { email: values.email });
      fetchUserData();
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };


  // Guardar apodo (wantToBeCalled) usando input de texto
  const handleNicknameSave = async () => {
    try {
      if (!user) return;
      setUpdatingNickname(true);
      await updateMmgUser(userId, { wantToBeCalled: nicknameDraft });
      setUser({ ...user, wantToBeCalled: nicknameDraft });
      setIsEditingNickname(false);
      showAlert("success", "Apodo actualizado exitosamente");
    } catch (error) {
      console.error("Error updating nickname:", error);
      showAlert("error", "Error al actualizar el apodo");
    } finally {
      setUpdatingNickname(false);
    }
  };

  // Guardar género usando input de texto
  const handleSaveGender = async () => {
    try {
      if (!user) return;
      setUpdatingGender(true);
      await updateMmgUser(userId, { gender: genderDraft });
      setUser({ ...user, gender: genderDraft });
      setIsEditingGenderText(false);
      showAlert("success", "Género actualizado exitosamente");
    } catch (error) {
      console.error("Error al actualizar género:", error);
      showAlert("error", "Error al actualizar el género");
    } finally {
      setUpdatingGender(false);
    }
  };

  // Guardar fecha de nacimiento
  const handleSaveBirthdate = async () => {
    try {
      if (!user) return;
      
      // Validar que la fecha no sea posterior a hoy
      const selectedDate = new Date(birthdateDraft);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear las horas para comparar solo la fecha
      
      if (selectedDate > today) {
        showAlert("error", "La fecha de nacimiento no puede ser posterior a hoy");
        setIsEditingBirthdate(false);
        setBirthdateDraft(user?.birthdate?.split("T")[0] || "");
        return;
      }
      
      setUpdatingBirthdate(true);
      // Convertir la fecha a formato ISO si es necesario
      const isoDate = birthdateDraft ? new Date(birthdateDraft).toISOString() : birthdateDraft;
      await updateMmgUser(userId, { birthdate: isoDate });
      setUser({ ...user, birthdate: isoDate });
      setIsEditingBirthdate(false);
      showAlert("success", "Fecha de nacimiento actualizada exitosamente");
    } catch (error) {
      console.error("Error al actualizar fecha de nacimiento:", error);
      showAlert("error", "Error al actualizar la fecha de nacimiento");
    } finally {
      setUpdatingBirthdate(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === "hipnosis") {
      setPaymentHistory([]);
    } else {
      setHipnosisHistory([]);
    }
    setActiveTab(tab);
  };

  const handleRowClick = (row: UnifiedAudioRequest) => {
    router.push(`/audio/${row._id}`);
  };

   // ... existing code ...

  // Función para mostrar el modal de confirmación del upsell
  const handleUpsellClick = () => {
    setShowUpsellModal(true);
  };

  // Función para confirmar y ejecutar el upsell
  const handleUpset = async () => {
    try {
      setUpdatingUpset(true);
      await updateMmgUser(userId, { auraEnabled: true });
      setUser(prevUser => prevUser ? { ...prevUser, auraEnabled: true } : null);
      showAlert("success", "Usuario actualizado: auraEnabled=true");
      setShowUpsellModal(false);
    } catch (error: any) {
      console.error("Error en upset:", error);
      showAlert("error", `Error al aplicar upset: ${error.message || "desconocido"}`);
    } finally {
      setUpdatingUpset(false);
    }
  };

  // Función para obtener el código de soporte
  const handleGetSupportCode = async () => {
    if (!user?.email) {
      showAlert("error", "No se encontró el email del usuario");
      return;
    }

    if (isOnCooldown) {
      showAlert("error", `Debe esperar ${cooldownTime} segundos para realizar una nueva solicitud`);
      return;
    }

    try {
      setLoadingSupportCode(true);
      const connectionService = new Connection();
      
      const response = await connectionService.post('/mmg-users/support-code', {
        email: user.email
      });

      if (response.data && (response.data as any).supportCode) {
        setSupportCode((response.data as any).supportCode);
        showAlert("success", "Código de soporte obtenido exitosamente");
        
        // Activar cooldown de 60 segundos
        setCooldownTime(60);
        setIsOnCooldown(true);
      } else {
        showAlert("error", "No se pudo obtener el código de soporte");
      }
    } catch (error: any) {
      console.error("Error al obtener código de soporte:", error);
      showAlert("error", `Error al obtener código de soporte: ${error.message || "desconocido"}`);
    } finally {
      setLoadingSupportCode(false);
    }
  };

  // Función para copiar código con feedback visual
  const handleCopyCode = async () => {
    if (!supportCode) return;
    
    try {
      await navigator.clipboard.writeText(supportCode);
      setCopied(true);
      
      // Volver al estado original después de 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
      showAlert("error", "Error al copiar el código");
    }
  };

  // Función para revocar tokens
  const handleRevokeTokens = async () => {
    if (!user?.email) {
      showAlert("error", "No se encontró el email del usuario");
      return;
    }

    try {
      setRevokingTokens(true);
      const connectionService = new Connection();
      
      const response = await connectionService.post('/mmg-users/revoke-tokens', {
        email: user.email,
        sendNotification: sendNotification
      });

      if (response.ok) {
        showAlert("success", "Tokens revocados exitosamente");
        setShowRevokeTokensModal(false);
        setSendNotification(false);
      } else {
        showAlert("error", "Error al revocar tokens");
      }
    } catch (error: any) {
      console.error("Error al revocar tokens:", error);
      showAlert("error", `Error al revocar tokens: ${error.message || "desconocido"}`);
    } finally {
      setRevokingTokens(false);
    }
  };


  // Definición de columnas para grids
  const hipnosisColumns: Column<UnifiedAudioRequest>[] = [
    {
      field: "audioMotive",
      header: "NOMBRE",
      render: (value, row) => (
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
          <div className="w-8 h-8 rounded-md overflow-hidden">
            <img
              src={row.imageUrl || "/play.svg"}
              alt="Audio thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-bold text-[16px] text-left">
              {row.title || "-"}
            </div>
            <CopyText
              text={`ID: ${row._id}`}
              className="cursor-pointer flex items-center gap-[5px] text-[12px] font-medium"
              iconClassName="w-[12px] h-[12px]"
              color="text-gray-500"
            />
          </div>
        </div>
      ),
    },
    {
      field: "status",
      header: "STATUS",
      render: (value) => <StatusBadge status={value as string} />,
    },
    {
      field: "settings",
      header: "NIVEL",
      render: (value, row) => {
        if (row.userLevel && typeof row.userLevel === "string") {
          return <div className="text-[1rem]">Nivel {row.userLevel}</div>;
        }
        return <div className="text-[1rem]">Sin nivel</div>;
      },
    },
    {
      field: "requestDate",
      header: "FECHA DE PEDIDO",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px] justify-center pl-[20%]"
          iconClassName="hidden"
          color="text-black"
        />
      ),
    },
    {
      field: "publicationDate",
      header: "FECHA DE ENTREGA",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px] justify-center pl-[20%]"
          iconClassName="hidden"
          color="text-black"
        />
      ),
    },
    {
      field: "audioUrlPlay",
      header: "AUDIO",
      render: (value, row) => (
        <div
          className="h-[40px] w-[300px] rounded-[30px] bg-gray-100 flex items-center mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <AudioPlayer
            src={value as string}
            showJumpControls={false}
            showFilledVolume={false}
            autoPlayAfterSrcChange={false}
            autoPlay={false}
            layout="horizontal-reverse"
            customControlsSection={[
              RHAP_UI.MAIN_CONTROLS,
              RHAP_UI.PROGRESS_BAR,
            ]}
            customProgressBarSection={[
              RHAP_UI.CURRENT_TIME,
              <div key="separator" className="mx-1">
                /
              </div>,
              RHAP_UI.DURATION,
              RHAP_UI.VOLUME_CONTROLS,
            ]}
            customIcons={{
              play: (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ),
              pause: (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ),
              volume: (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ),
              volumeMute: (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                </svg>
              ),
            }}
            style={{
              background: "transparent",
              boxShadow: "none",
            }}
            className="audio-player-custom"
          />
        </div>
      ),
    },
    {
      field: "audioUrl",
      header: "URL",
      render: (value) => (
        <button
          className="text-blue-500 hover:text-blue-700 font-medium"
          onClick={(e) => {
            e.stopPropagation();
            if (value && typeof value === "string") {
              navigator.clipboard.writeText(
                (value as string) || "https://mentalmagnet.com"
              );
            }
          }}
        >
          Copiar URL
        </button>
      ),
    },
  ];

  const handleNewTab = (row: UnifiedAudioRequest) => {
    window.open(
      window.location.href.split("/")[0] + `/audio/${row.id || row._id}`,
      "_blank"
    );
  };

  const getSourceDisplay = (source: string, processor: string = "") => {
    let displayText = "";
    let bgColor = "";
    let textColor = "";

    // Normalizar las fuentes a solo 4 opciones
    if (
      source.includes("app_store") ||
      source.includes("apple") ||
      source === "ios" ||
      source === "revenuecat_app_store" ||
      processor.includes("app_store") ||
      processor.includes("apple") ||
      processor === "ios" ||
      processor === "revenuecat_app_store"
    ) {
      displayText = "iOS";
      bgColor = "bg-[#adadad]";
      textColor = "text-[#383838]";
    } else if (
      source.includes("play_store") ||
      source.includes("google") ||
      source === "android" ||
      source === "revenuecat_play_store" ||
      processor.includes("play_store") ||
      processor.includes("google") ||
      processor === "android" ||
      processor === "revenuecat_play_store"
    ) {
      displayText = "Android";
      bgColor = "bg-[#d2fecc]";
      textColor = "text-[#326830]";
    } else if (
      source.includes("paypal") ||
      source === "paypal_v2" ||
      processor.includes("paypal_v2") ||
      processor === "paypal_v2"
    ) {
      displayText = "PayPal";
      bgColor = "bg-[#c2ddfd]";
      textColor = "text-[#2246d8]";
    } else {
      // Si no es ninguna de las anteriores, mostrar como Stripe
      displayText = "Stripe";
      bgColor = "bg-[#eecbff]";
      textColor = "text-[#ac2bad]";
    }

    return { displayText, bgColor, textColor };
  };

  const paymentColumns: Column<Membership>[] = [
    {
      field: "status",
      header: "ESTADO",
      render: (value) => (
        <span
          className={`inline-flex items-center justify-center w-[126px] py-2.5 rounded-[24px] text-[14px] font-semibold ${
            value === "completed"
              ? "bg-[#d2fecc] text-[#326830]"
              : value === "pending"
              ? "bg-[#ffe98f] text-[#ff9e1f]"
              : value === "failed"
              ? "bg-[#adadad] text-[#383838]"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value === "completed"
            ? "EXITOSO"
            : value === "pending"
            ? "PENDIENTE"
            : value === "failed"
            ? "FALLIDO"
            : (value as string) || "SIN ESTADO"}
        </span>
      ),
    },
    {
      field: "source",
      header: "FUENTE",
      render: (value, row) => {
        const source = (value as string) || "";
        const processor = (row.processor as string) || "";
        const { displayText, bgColor, textColor } = getSourceDisplay(
          source,
          processor
        );

        return (
          <span
            className={`inline-flex items-center justify-center w-[130px] py-2.5 rounded-[24px] text-[14px] font-semibold ${bgColor} ${textColor}`}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      field: "_id",
      header: "ID TRANSACCIÓN",
      render: (value) => (
        <span className="font-medium">
          {(value as string) || "21983dasjvdca"}
        </span>
      ),
    },
    {
      field: "amount",
      header: "MONTO",
      render: (value) => (
        <span className="font-medium">${Number(value).toFixed(0)}</span>
      ),
    },
    {
      field: "currency",
      header: "MONEDA",
      render: (value) => (
        <span className="font-medium">
          {(value as string)?.toUpperCase() || "USD"}
        </span>
      ),
    },
    {
      field: "paymentDate",
      header: "FECHA PAGO",
      render: (value) => {
        const date = new Date(value as string);
        return (
          <span className="font-medium">
            {date.getDate()} {MONTHS_ES[date.getMonth()]} {date.getFullYear()},
            {date.getHours()}:{date.getMinutes().toString().padStart(2, "0")}
          </span>
        );
      },
    },
    {
      field: "processor",
      header: "PROCESADOR",
      render: (value) => {
        const processorValue = (value as string) || "";
        if (!processorValue || processorValue === "sin procesador") {
          return (
            <span className="inline-flex items-center justify-center px-8 py-2.5 rounded-[24px] text-[12px] font-semibold bg-gray-100 text-gray-500 ml-2">
              Sin procesador
            </span>
          );
        }
        
        const { displayText, bgColor, textColor } = getSourceDisplay(processorValue, processorValue);
        
        return (
          <span className={`inline-flex items-center justify-center w-[130px] py-2.5 rounded-[24px] text-[12px] font-semibold ${bgColor} ${textColor}`}>
            {displayText}
          </span>
        );
      },
    },
  ];

  // Manejador para crear membresía
  const handleCreateMembership = async () => {
    setIsCreatingMembership(true);
    setCreateMembershipError(null);

    try {
      const membershipData = {
        userId,
        membershipType:
          membershipType === "Mensual"
            ? "monthly"
            : membershipType === "Anual"
            ? "yearly"
            : "free",
        amount: parseInt(membershipAmount),
        currency: membershipCurrency.toLowerCase(),
        processor: membershipProcessor,
        source: membershipProcessor,
        availableAudios: parseInt(membershipAudios),
        paymentDate: membershipDate || new Date().toISOString(),
      };

      await createMembership(membershipData);
      setIsMembershipModalOpen(false);

      // Recargar datos del usuario
      await fetchUserData();

      // Si estamos en la pestaña pagos, refrescar los datos
      if (activeTab === "pagos") {
        await fetchGridData("pagos");
      }
    } catch (error) {
      console.error("Error al crear membresía:", error);
      setCreateMembershipError(
        "Error al crear la membresía. Intente nuevamente."
      );
    } finally {
      setIsCreatingMembership(false);
    }
  };

  // Estado para las alertas
  const [alertState, setAlertState] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Función para mostrar alertas
  const showAlert = (type: "success" | "error", message: string) => {
    setAlertState({
      show: true,
      type,
      message,
    });
    // Auto-ocultar después de 5 segundos
    setTimeout(() => setAlertState(null), 5000);
  };

  // Función para manejar la cancelación
  const handleCancelSubscription = async () => {
    if (!user) return;

    setCancelling(true);
    try {
      // Verificar si es RevenueCat (processorData existe)
      const isRevenueCat = user && Object.keys(user).includes("processorData");
      
      const bodyToSend = isRevenueCat
        ? { email: user.email }
        : { email: user.email, cancelAtPeriodEnd: cancelAtPeriodEnd };

      const response = await membershipService.cancelMembership(bodyToSend);
      
      // Manejar según el código de estado
      if (response.statusCode === 204) {
        showAlert("error", "Usuario ya había cancelado Stripe previamente");
      } else if (!response.ok && response.statusCode >= 400) {
        // Bad request u otros errores del servidor
        const errorMessage = response.data?.message || "Error al cancelar suscripción";
        showAlert("error", errorMessage);
      } else {
        // Éxito normal
        showAlert("success", `Suscripción de ${user.email} cancelada exitosamente`);
      }
      
      // Recargar datos del usuario
      await fetchUserData();
      
      setShowCancelModal(false);
    } catch (error: any) {
      console.error("Error al cancelar:", error);
      // Manejar errores de red u otros errores
      const errorMessage = error.message || error.response?.data?.message || "Error al cancelar suscripción";
      showAlert("error", errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  // Función para verificar si se puede cancelar la suscripción
  const canCancelSubscription = () => {
    if (!user || !user.isActiveInStripe) return false;
    
    const hasActiveMembership = getMembershipStatus(user.lastMembership) === "Activa";
    const isTrialUserCheck = isTrialUser(user);
    
    return hasActiveMembership || isTrialUserCheck;
  };

  // Función para manejar la cancelación de la próxima hipnosis
  const handleCancelNextHypnosis = async () => {
    if (!user) return;

    setCancellingHypnosis(true);
    try {
      await cancelNextHypnosis(userId);
      
      showAlert("success", "Próxima hipnosis cancelada exitosamente. La fecha de membresía se ha ajustado.");
      
      // Recargar datos del usuario
      await fetchUserData();
      
      setShowCancelHypnosisModal(false);
    } catch (error: any) {
      console.error("Error al cancelar próxima hipnosis:", error);
      showAlert("error", `Error al cancelar próxima hipnosis: ${error.message}`);
    } finally {
      setCancellingHypnosis(false);
    }
  };

  // Función para verificar si se puede cancelar la próxima hipnosis
  const canCancelNextHypnosis = () => {
    if (!user) return false;
    
    // Solo permitir si tiene una membresía activa, una fecha de próxima hipnosis y nextAvailableForm está habilitado
    const hasActiveMembership = getMembershipStatus(user.lastMembership) === "Activa";
    const hasNextHypnosisDate = user.features?.nextAvailableForm?.value;
    const isNextAvailableFormEnabled = user.features?.nextAvailableForm?.enabled !== false;
    
    return hasActiveMembership && hasNextHypnosisDate && isNextAvailableFormEnabled;
  };

  // Renderizado
  return (
    <div className="min-h-screen">
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

      {/* Botón Volver */}
      <div className="px-1 mb-1">
        <button
          onClick={() => {
            // Usar router.back() para mantener el historial de navegación
            router.back();
            // Almacenar la URL actual para referencia futura
            if (typeof window !== "undefined") {
              localStorage.setItem(
                "lastUserDetailUrl",
                window.location.pathname
              );
            }
          }}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
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
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <Loading text="Cargando..." />
        </div>
      ) : (
        <div className="px-2">
          {/* Información del usuario */}
          <div className="rounded-lg px-4 py-2 mb-5">
            <div className="flex items-center gap-4 relative">
              <div className="relative w-16 h-16">
                <img
                  src="/user.svg"
                  alt="Avatar de usuario"
                  className="w-full h-full rounded-full object-cover opacity-30"
                />
              </div>
              <div>
                <h4 className="text-xl font-display font-bold text-gray-900">
                  {`${user?.names} ${user?.lastnames}`}
                </h4>
                <CopyText
                  text={user?.email  || "correo@ejemplo.com"}
                  color="text-gray-700"
                  className="font-display text-lg inline-block"
                  iconClassName="inline-block ml-1"
                />
              </div>
              <div className="flex items-center gap-3 ml-auto">
                {/* Botón Cancelar próxima hipnosis */}
                <button
                  onClick={() => setShowCancelHypnosisModal(true)}
                  disabled={!canCancelNextHypnosis()}
                  className={`px-6 py-3 rounded-md text-base font-medium transition-colors ${
                    canCancelNextHypnosis()
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title={
                    canCancelNextHypnosis() 
                      ? "Cancelar la próxima hipnosis ajustando la fecha de membresía" 
                      : "No hay próxima hipnosis disponible para cancelar"
                  }
                >
                  Cancelar próxima hipnosis
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={!canCancelSubscription()}
                  className={`px-[47px] py-3 rounded-md text-base font-medium transition-colors ${
                    canCancelSubscription()
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Cancelar suscripción
                </button>
                
                {/* Botón Cambiar correo electrónico */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-black text-white rounded-md text-base font-medium hover:bg-gray-800 transition-colors"
                >
                  Cambiar correo electrónico
                </button>

                {/* Botón Revocar tokens */}
                <button
                  onClick={() => setShowRevokeTokensModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-md text-base font-medium hover:bg-red-700 transition-colors"
                >
                  Revocar tokens
                </button>
              </div>
            </div>
          </div>

          {/* Grid de 3 columnas */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {/* Datos */}
            <div className="bg-white rounded-[20px] p-4">
              <div className="flex gap-2 mb-4 items-center justify-between">
                <div className="text-[24px] font-bold text-gray-500">Datos</div>
                <CopyText
                  text={`ID: ${user?._id?.toString() || ""}`}
                  color="text-gray-400"
                  className="text-[12px] font-mono inline-block"
                  iconClassName="inline-block ml-1"
                />
              </div>
              <div className="h-[1px] bg-gray-200 mb-4 rounded-full"></div>

              <div className="space-y-4">
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Nombre completo
                  </p>
                  <p className="text-[14px] font-bold">
                    {user?.names || "Sin nombre"} {user?.lastnames || ""}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Apodo
                  </p>
                  <div className="flex items-center gap-2">
                    {isEditingNickname ? (
                      <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNicknameSave();
                          if (e.key === 'Escape') setIsEditingNickname(false);
                        }}
                        disabled={updatingNickname}
                        className="text-[14px] font-bold bg-gray-100 rounded px-2 py-1 flex-1"
                        autoFocus
                        onBlur={handleNicknameSave}
                        placeholder="Sin apodo"
                      />
                    ) : (
                      <>
                        <p className="text-[14px] font-bold flex-1">
                          {user?.wantToBeCalled || "Sin apodo"}
                        </p>
                        {updatingNickname ? (
                          <div className="animate-spin w-5 h-5">
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-40" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setNicknameDraft(user?.wantToBeCalled || "");
                              setIsEditingNickname(true);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Editar apodo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Género
                  </p>
                  <div className="flex items-center gap-2">
                    {isEditingGenderText ? (
                      <input
                        type="text"
                        value={genderDraft}
                        onChange={(e) => setGenderDraft(e.target.value)}
                        onBlur={handleSaveGender}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGender();
                          if (e.key === "Escape") {
                            setGenderDraft(user?.gender || "");
                            setIsEditingGenderText(false);
                          }
                        }}
                        disabled={updatingGender}
                        className="text-[14px] font-bold bg-gray-100 rounded px-2 py-1 flex-1"
                        autoFocus
                        placeholder="Sin género"
                      />
                    ) : (
                      <>
                        <p className="text-[14px] font-bold flex-1">
                          {user?.gender || "Sin género"}
                        </p>
                        {updatingGender ? (
                          <div className="animate-spin w-5 h-5">
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-40"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-90"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setGenderDraft(user?.gender || "");
                              setIsEditingGenderText(true);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Editar género"
                          >
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
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Nacimiento
                  </p>
                  <div className="flex items-center gap-2">
                    {isEditingBirthdate ? (
                      <input
                        type="date"
                        value={birthdateDraft}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBirthdateDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveBirthdate();
                          if (e.key === 'Escape') setIsEditingBirthdate(false);
                        }}
                        disabled={updatingBirthdate}
                        className="text-[14px] font-bold bg-gray-100 rounded px-2 py-1 flex-1"
                        autoFocus
                        onBlur={handleSaveBirthdate}
                      />
                    ) : (
                      <>
                        <p className="text-[14px] font-bold flex-1">
                          {user?.birthdate.split("T")[0] || "Sin nacimiento"}
                        </p>
                        {updatingBirthdate ? (
                          <div className="animate-spin w-5 h-5">
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-40" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setBirthdateDraft(user?.birthdate?.split("T")[0] || "");
                              setIsEditingBirthdate(true);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Editar fecha de nacimiento"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {/* ✅ CAMPO DEVICE CORREGIDO */}
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Dispositivo
                  </p>
                  <p className="text-[14px] font-bold">
                    {user?.device || "Sin dispositivo"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Idioma
                  </p>
                  <p className="text-[14px] font-bold">
                    {user?.language === "es" ? "Español" : user?.language === "en" ? "English" : "Sin idioma"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cuenta */}
            <div className="bg-white rounded-[20px] p-4">
              <div className="text-[24px] font-bold text-gray-500 mb-4">
                Cuenta
              </div>
              <div className="h-[1px] bg-gray-200 mb-4 rounded-full"></div>

              <div className="space-y-4">
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Nivel
                  </p>
                  <p className="text-[14px] font-bold">
                    {user?.userLevel || "Sin nivel"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                  Próximo portal disponible
                  </p>
                  <p className="text-[14px] font-bold">
                    {canCancelSubscription() 
                      ? (user?.features?.nextAvailableForm?.value ? formatDateUTC(user.features.nextAvailableForm.value.toString()) : "Sin hipnosis disponibles")
                      : "No disponible"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Código de acceso
                  </p>
                  <p className="text-[14px] font-bold">
                    {user?.loginCode || "Sin código de acceso"}
                  </p>
                </div>
              </div>
            </div>

            {/* Suscripción */}
            <div className="bg-white rounded-[20px] p-4">
              <div className="text-[24px] font-bold text-gray-500 mb-4">
                Suscripción
              </div>
              <div className="h-[1px] bg-gray-200 mb-4 rounded-full"></div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                      Estado
                    </p>
                    <p
                      className={`text-[14px] font-bold ${
                        getMembershipStatus(user?.lastMembership) === "Activa"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {getMembershipStatus(user?.lastMembership)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start">
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Otorgar Aura
                    </p>
                    <button
                      onClick={handleUpsellClick}
                      disabled={updatingUpset || !!user?.auraEnabled}
                      title={user?.auraEnabled ? "Aura ya activado" : "Activar Aura"}
                      className={`px-3 h-6 rounded-xl text-sm font-medium transition-colors flex items-center justify-center min-w-[50px] ${
                        updatingUpset || user?.auraEnabled
                          ? "bg-[#f4b994] text-[#ed713a] cursor-not-allowed"
                          : "bg-gray-300 text-gray-500 hover:bg-gray-400"
                      }`}
                    >
                      {updatingUpset ? (
                        <div className="animate-spin w-3 h-3">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      ) : user?.auraEnabled ? (
                        "Aura"
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Plan
                  </p>
                  <p className="text-[14px] font-bold">
                    {getSubscriptionType(
                      user?.lastMembership.type || "",
                      user?.lastMembership.membershipDate
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Fecha de inicio
                  </p>
                  <CopyText
                    text={`${formatDateUTC(
                      user?.lastMembership.membershipDate
                    )}`}
                    className="text-[14px] font-bold flex items-center gap-[5px]"
                    iconClassName="hidden"
                    color="text-black"
                  />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Próximo pago
                  </p>
                  <CopyText
                    text={`${formatDateUTC(
                      user?.lastMembership?.membershipPaymentDate
                    )}`}
                    className="text-[14px] font-bold flex items-center gap-[5px]"
                    iconClassName="hidden"
                    color="text-black"
                  />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    Fuente
                  </p>
                  <div>
                    {(() => {
                      const source = (user?.lastMembership as any)?.source || "";
                      const processor = (user?.lastMembership as any)?.processor || "";
                      const { displayText, bgColor, textColor } = getSourceDisplay(source, processor);
                      
                      return (
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-[24px] text-[12px] font-semibold ${bgColor} ${textColor}`}
                        >
                          {displayText}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer de advertencia */}
          <div className="px-2 mb-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-yellow-800">
                  <strong>Advertencia:</strong> Chequear que el correo electrónico sea el mismo que el titular de la cuenta
                </p>
              </div>
            </div>
          </div>

          {/* Botón Obtener código de soporte */}
          <div className="px-2 mb-5 flex items-center gap-6">
            <button
              onClick={handleGetSupportCode}
              disabled={loadingSupportCode || isOnCooldown}
              className={`px-6 py-4 rounded-lg text-base font-medium transition-colors ${
                loadingSupportCode || isOnCooldown
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loadingSupportCode ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  Obteniendo...
                </div>
              ) : isOnCooldown ? (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Esperar {cooldownTime}s
                </div>
              ) : (
                "Obtener support code"
              )}
            </button>
            
            {/* Mostrar código de login cuando esté disponible */}
            {supportCode && (
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border">
                <span className="text-sm font-medium text-gray-600">Support Code:</span>
                <span className="text-lg font-mono font-bold text-gray-900 bg-white px-3 py-1 rounded border">
                  {supportCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-white hover:bg-gray-700"
                  }`}
                  title={copied ? "¡Copiado!" : "Copiar código"}
                >
                  {copied ? (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ¡Copiado!
                    </div>
                  ) : (
                    "Copiar"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="p-2">
            <h2 className="text-[30px] font-bold mb-4 text-gray-900">
              Historial
            </h2>
            <div className="mb-4">
              <button
                className={`px-4 py-2 ${
                  activeTab === "hipnosis"
                    ? "text-black border-b-[3px] border-black font-bold"
                    : "text-gray-400"
                }`}
                onClick={() => handleTabChange("hipnosis")}
              >
                Hipnosis
              </button>
              <button
                className={`px-4 py-2 ${
                  activeTab === "pagos"
                    ? "text-black border-b-[3px] border-black font-bold"
                    : "text-gray-400"
                }`}
                onClick={() => handleTabChange("pagos")}
              >
                Pagos
              </button>
            </div>


            {activeTab === "hipnosis" ? (
              <div className="relative">
                {loadingHipnosis && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <Loading text="Cargando datos..." />
                  </div>
                )}
                <GridDataView<UnifiedAudioRequest>
                  key={`hipnosis-grid-${activeTab}`}
                  data={hipnosisHistory}
                  columns={hipnosisColumns}
                  isLoading={loadingHipnosis}
                  defaultSortField="requestDate"
                  defaultSortDirection="desc"
                  showSearch={false}
                  onRowClick={handleRowClick}
                  onNewTab={handleNewTab}
                />
              </div>
            ) : (
              <div className="relative">
                {loadingPayments && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <Loading text="Cargando datos..." />
                  </div>
                )}
                <GridDataView<Membership>
                  key={`payments-grid-${activeTab}`}
                  data={paymentHistory}
                  columns={paymentColumns}
                  isLoading={loadingPayments}
                  defaultSortField="createdAt"
                  defaultSortDirection="desc"
                  showSearch={false}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="w-[600px] bg-white rounded-[20px] p-4  justify-center">
            <div className="justify-start mb-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-black"
              >
                <svg
                  className="w-6 h-6 bg-black rounded-full"
                  fill="none"
                  stroke="white"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-8 py-4 justify-center">
              <h2 className="text-[30px] font-extrabold text-center mb-8">
                Cambiar correo electronico
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get("email") as string;
                  handleSubmit({ email });
                }}
              >
                <input
                  type="email"
                  id="email"
                  name="email"
                  defaultValue={user?.email}
                  className="w-full text-[20px] px-6 py-4 bg-gray-100 rounded-xl mb-6 text-center"
                  required
                />
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="w-[200px] bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-900 transition"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de creación de membresía */}
      {isMembershipModalOpen && (
        <Modal onClose={() => setIsMembershipModalOpen(false)}>
          <div className="w-[600px] bg-white rounded-[20px] p-4">
            <div className="flex justify-start mb-4">
              <button
                onClick={() => setIsMembershipModalOpen(false)}
                className="text-black"
              >
                <svg
                  className="w-6 h-6 bg-black rounded-full"
                  fill="none"
                  stroke="white"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-8 py-4">
              <h2 className="text-[30px] font-extrabold text-center mb-6">
                Crear membresía
              </h2>

              <div className="space-y-6">
                {/* Tipo de membresía */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Tipo de membresía
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMembershipType("Gratis")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipType === "Gratis"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      Gratis
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipType("Mensual")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipType === "Mensual"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipType("Anual")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipType === "Anual"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      Anual
                    </button>
                  </div>
                </div>

                {/* Monto a pagar */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Monto a pagar
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMembershipAmount("0")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipAmount === "0"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipAmount("20")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipAmount === "20"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      20
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipAmount("100")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipAmount === "100"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      100
                    </button>
                  </div>
                </div>

                {/* Moneda */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Moneda
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMembershipCurrency("EUR")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipCurrency === "EUR"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      EUR
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipCurrency("MXN")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipCurrency === "MXN"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      MXN
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipCurrency("USD")}
                      className={`py-3 px-4 rounded-xl border ${
                        membershipCurrency === "USD"
                          ? "border-black"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      USD
                    </button>
                  </div>
                </div>

                {/* Procesador */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Procesador
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMembershipProcessor("iOS")}
                      className="py-3 px-4 rounded-[30px] bg-[#adadad] text-[#383838] font-medium"
                    >
                      iOS
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipProcessor("Android")}
                      className="py-3 px-4 rounded-[30px] bg-[#d2fecc] text-[#326830] font-medium"
                    >
                      Android
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipProcessor("PayPal")}
                      className="py-3 px-4 rounded-[30px] bg-[#c2ddfd] text-[#2246d8] font-medium"
                    >
                      PayPal
                    </button>
                    <button
                      type="button"
                      onClick={() => setMembershipProcessor("Stripe")}
                      className="py-3 px-4 rounded-[30px] bg-[#eecbff] text-[#ac2bad] font-medium"
                    >
                      Stripe
                    </button>
                  </div>
                </div>

                {/* Audios disponibles */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Audios disponibles
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="number"
                      value={membershipAudios}
                      onChange={(e) => setMembershipAudios(e.target.value)}
                      className="py-3 px-4 rounded-xl border border-gray-300 bg-gray-100 text-center"
                      min="0"
                    />
                  </div>
                </div>

                {/* Fecha de pago y facturación */}
                <div>
                  <label className="block text-[16px] font-semibold mb-2">
                    Fecha de pago y facturación
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="date"
                      value={membershipDate}
                      onChange={(e) => setMembershipDate(e.target.value)}
                      className="py-3 px-4 rounded-xl border border-gray-300 bg-gray-100 text-center"
                    />
                  </div>
                </div>

                {createMembershipError && (
                  <p className="text-red-500 text-center">
                    {createMembershipError}
                  </p>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleCreateMembership}
                    disabled={isCreatingMembership}
                    className={`w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition ${
                      isCreatingMembership
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isCreatingMembership ? "Creando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de cancelación de suscripción */}
      {showCancelModal && (
        <Modal onClose={() => setShowCancelModal(false)}>
          <div className="w-[500px] bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Cancelar Suscripción</h2>
            <p>
              ¿Estás seguro de que quieres cancelar la suscripción de{" "}
              {user && Object.keys(user).includes("processorData") ? "RevenueCat" : "Stripe"} de{" "}
              {user?.email}?
            </p>

            {user && !Object.keys(user).includes("processorData") && (
              <label className="flex items-center gap-2 text-sm mt-2 mb-2 font-medium">
                <input
                  type="checkbox"
                  checked={cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(!cancelAtPeriodEnd)}
                />
                Cancelar al final del periodo
              </label>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${
                  cancelling ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {cancelling ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de cancelación de próxima hipnosis */}
      {showCancelHypnosisModal && (
        <Modal onClose={() => setShowCancelHypnosisModal(false)}>
          <div className="w-[500px] bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Cancelar Próxima Hipnosis</h2>
            <p className="mb-6">
              ¿Estás seguro de que quieres cancelar la próxima hipnosis de{" "}
              <strong>{user?.email}</strong>?
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelHypnosisModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelNextHypnosis}
                disabled={cancellingHypnosis}
                className={`px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 ${
                  cancellingHypnosis ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {cancellingHypnosis ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación del upsell */}
      {showUpsellModal && (
        <Modal onClose={() => setShowUpsellModal(false)}>
          <div className="w-[500px] bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Activar Upsell (Aura)</h2>
            <p className="mb-6">
              ¿Estás seguro de que quieres activar el upsell (Aura) para el usuario{" "}
              <strong>{user?.email}</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Esta acción habilitará la funcionalidad de Aura para el usuario seleccionado.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpsellModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpset}
                disabled={updatingUpset}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                  updatingUpset ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {updatingUpset ? "Activando..." : "Confirmar Activación"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de revocar tokens */}
      {showRevokeTokensModal && (
        <Modal onClose={() => setShowRevokeTokensModal(false)}>
          <div className="w-[500px] bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Revocar Tokens</h2>
            <p className="mb-6">
              ¿Estás seguro de que quieres revocar los tokens del usuario{" "}
              <strong>{user?.email}</strong>?
            </p>
            
            <label className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium">Enviar notificación</span>
            </label>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRevokeTokensModal(false);
                  setSendNotification(false);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={revokingTokens}
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeTokens}
                disabled={revokingTokens}
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${
                  revokingTokens ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {revokingTokens ? "Revocando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Alerta de notificaciones */}
      {alertState?.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant={alertState.type}
            title={alertState.type === "success" ? "¡Éxito!" : "Error"}
            description={alertState.message}
            onClose={() => setAlertState(null)}
          />
        </div>
      )}
    </div>
  );
}
