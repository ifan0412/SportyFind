"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import { BackButton } from "@/components/BackButton";
import { FriendsTab } from "@/components/FriendsTab";
import { DashboardTab } from "@/components/profile/DashboardTab";
import { FeedTab } from "@/components/profile/FeedTab";
import { ExpertiseTab } from "@/components/profile/ExpertiseTab";
import { HighlightsTab } from "@/components/profile/HighlightsTab";
import { AccountManagementTab } from "@/components/profile/AccountManagementTab";
import { ProfileRolePreview, type AthleteSubTab, type ProfileRole } from "@/components/profile/ProfileRolePreview";
import { getSportSchema } from "@/constants/sportsSchema";
import { getSportCategory, normalizeSportCategory, type SportCategoryId } from "@/lib/sports-categories";
import { normalizePhysioProfileTags } from "@/lib/physio-service-types";
import { SportCategoryPicker } from "@/components/sports/SportCategoryPicker";
import { SportPositionPicker } from "@/components/sports/SportPositionPicker";
import { normalizeSportMetadataForSave, sportFormDataFromMetadata, sportFormHasEmptyFields } from "@/lib/sport-positions";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import {
  formatDistrictList,
  isHongKongCountry,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";

interface Profile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  handle: string | null;
  headline: string | null;
  bio: string | null;
  athlete_bio?: string | null;
  coach_bio?: string | null;
  location: string | null;
  country: string | null;
  region: string | null;
  avatar_url: string | null;
  status_tag: string | null;
  display_sports: string[] | null;
  is_player: boolean | null;
  is_coach: boolean | null;
  is_physio: boolean | null;
  height_cm: number | null;
  weight_kg: number | null;
  show_physical_stats: boolean | null;
  contact_email: string | null;
  contact_phone: string | null;
  player_whatsapp: string | null;
  player_phone_friends_only: boolean | null;
  player_whatsapp_friends_only: boolean | null;
  address: string | null;
  city_region: string | null;
  coach_teaching_experience_years?: number | null;
  is_address_public: boolean | null;
  instagram_url: string | null;
  facebook_url: string | null;
  threads_url: string | null;
  physio_rate: number | string;
  clinic_name: string | null;
  physio_status: string | null;
  physio_country: string | null;
  physio_region: string | null;
  physio_experience_years: string | null;
  physio_qualifications: string | null;
  physio_services_offered: string | null;
  physio_service_tags?: string[] | null;
  physio_contact_email: string | null;
  physio_contact_phone: string | null;
  physio_city_region: string | null;
  physio_address: string | null;
  physio_is_address_public: boolean | null;
  physio_instagram_url: string | null;
  physio_facebook_url: string | null;
  physio_threads_url: string | null;
}

interface Sport { id: string; name: string; }
interface UserSport { id: string; sport_id: string; sort_order?: number; metadata: { position?: string; [key: string]: any }; sports: { name: string } | null; }
interface MediaItem { id: string; sportName: string; type: "image" | "video"; url: string; fileName?: string; createdAt: string; }
interface UserTeamRow {
  role: string;
  joined_at: string;
  teams: {
    id: string;
    name_en: string;
    name_zh: string | null;
    sport_category: string;
    recruitment_status: string;
    logo_url: string | null;
  } | null;
}

const TEAM_SPORT_EMOJI: Record<string, string> = Object.fromEntries(
  ["volleyball", "basketball", "soccer", "tennis", "badminton", "pickleball", "gym", "running", "boxing", "yoga"].map((id) => [
    id,
    getSportCategory(id)?.emoji ?? "🏅",
  ])
);
const TEAM_SPORT_ZH: Record<string, string> = Object.fromEntries(
  ["volleyball", "basketball", "soccer", "tennis", "badminton", "pickleball", "gym", "running", "boxing", "yoga"].map((id) => [
    id,
    getSportCategory(id)?.labelZh ?? id,
  ])
);

type PrivateTabId = "dashboard" | "friends" | "teams" | "account";

const DEFAULT_FORM = {
  first_name: "", last_name: "", handle: "", full_name: "", headline: "", location: "", country: "", region: "", bio: "", athlete_bio: "", avatar_url: "", status_tag: "committed", display_sports: [] as string[],
  is_player: true,
  is_coach: false,
  is_physio: false,
  height_cm: "",
  weight_kg: "",
  show_physical_stats: true,
  contact_email: "",
  contact_phone: "",
  player_whatsapp: "",
  player_phone_friends_only: false,
  player_whatsapp_friends_only: false,
  address: "",
  city_region: "",
  coach_service_centre: "",
  is_address_public: true,
  instagram_url: "",
  facebook_url: "",
  threads_url: "",
  physio_rate: "" as number | string,
  clinic_name: "",
  physio_status: "hidden",
  physio_country: "",
  physio_region: "",
  physio_experience_years: "",
  physio_qualifications: "",
  physio_services_offered: "",
  physio_service_tags: [] as string[],
  physio_contact_email: "",
  physio_contact_phone: "",
  physio_city_region: "",
  physio_address: "",
  physio_is_address_public: true,
  physio_instagram_url: "",
  physio_facebook_url: "",
  physio_threads_url: "",
  districts: [] as string[],
  subdistricts: [] as string[],
  coach_districts: [] as string[],
  coach_subdistricts: [] as string[],
  coach_teaching_experience_years: "" as number | string,
  physio_districts: [] as string[],
  physio_subdistricts: [] as string[],
};

const compressImage = (file: File | Blob): Promise<File | Blob> => new Promise((resolve) => { if (file.size <= 1.5 * 1024 * 1024) return resolve(file); const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const MAX = 1200; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } } const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d"); if (!ctx) return resolve(file); ctx.drawImage(img, 0, 0, w, h); canvas.toBlob((blob) => resolve(blob ? new File([blob], file instanceof File ? file.name : "cropped.jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.8); }; img.src = e.target?.result as string; }; reader.readAsDataURL(file); });
const createImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener("load", () => resolve(image)); image.addEventListener("error", (error) => reject(error)); image.src = url; });
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => { const image = await createImage(imageSrc); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); if (!ctx) return null; canvas.width = pixelCrop.width; canvas.height = pixelCrop.height; ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height); return new Promise((resolve) => { canvas.toBlob((file) => resolve(file), "image/jpeg"); }); };

const StatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "hidden" || tag === "draft") return <div className="inline-flex items-center gap-1.5 bg-slate-800 text-zinc-500 text-[10px] px-2.5 py-1 rounded-full font-black border border-slate-700">🔒 未發布 (隱藏中)</div>;
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生/招募中</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰</div>;
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy" || tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員/滿診</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

function ProfilePageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingAvatarFile = useRef<File | Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [privateTab, setPrivateTab] = useState<PrivateTabId | null>(null);
  const [activeRole, setActiveRole] = useState<ProfileRole>("athlete");
  const [activeAthleteTab, setActiveAthleteTab] = useState<AthleteSubTab>("expertise");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>(DEFAULT_FORM);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [locationData, setLocationData] = useState<Record<string, string[]>>({});

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportSlug, setSelectedSportSlug] = useState<SportCategoryId | "">("");
  const [sportDynamicData, setSportDynamicData] = useState<Record<string, string | string[]>>({});
  const [editingUserSportId, setEditingUserSportId] = useState<string | null>(null);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [uploadMediaSport, setUploadMediaSport] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<MediaItem | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeamRow[]>([]);
  const [coachServices, setCoachServices] = useState<any[]>([]);
  const [physioServices, setPhysioServices] = useState<any[]>([]);
  const [coachReviews, setCoachReviews] = useState<{ rating: number }[]>([]);

  useEffect(() => {
    const tabParam = searchParams?.get("tab") || searchParams?.get("view");
    if (tabParam && ["dashboard", "friends", "teams", "account"].includes(tabParam)) {
      setPrivateTab(tabParam as PrivateTabId);
    } else if (tabParam === "coach") {
      setPrivateTab(null);
      setActiveRole("coach");
    } else if (tabParam === "physio") {
      setPrivateTab(null);
      setActiveRole("physio");
    } else if (tabParam === "expertise" || tabParam === "highlights" || tabParam === "feed") {
      setPrivateTab(null);
      setActiveRole("athlete");
      setActiveAthleteTab(tabParam as AthleteSubTab);
    }
  }, [searchParams]);

  const showPlayer = profile?.is_player !== false || editForm.is_player;
  const showCoach = !!(profile?.is_coach || editForm.is_coach);
  const showPhysio = !!(profile?.is_physio || editForm.is_physio);

  useEffect(() => {
    if (!showPlayer && activeRole === "athlete") {
      if (showCoach) setActiveRole("coach");
      else if (showPhysio) setActiveRole("physio");
    }
  }, [showPlayer, showCoach, showPhysio, activeRole]);

  const handlePrivateTabSwitch = useCallback((tab: PrivateTabId) => {
    setPrivateTab(tab);
    if (window.innerWidth < 1024 && contentRef.current) {
      const y = contentRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const handleReturnToPreview = useCallback(() => {
    setPrivateTab(null);
  }, []);

  const loadProfileData = useCallback(async (userId: string) => {
    try {
      const [
        { data: prof },
        { data: usData },
        { data: sData },
        { data: locData },
        { data: teamsData },
        { data: coachSvc },
        { data: physioSvc },
        { data: reviewsData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_sports").select("id, sport_id, metadata, sort_order, sports(name)").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("sports").select("*").order("name", { ascending: true }),
        supabase.from("locations").select("country, region"),
        supabase.from("team_members").select("role, joined_at, teams(id, name_en, name_zh, sport_category, recruitment_status, logo_url)").eq("user_id", userId),
        supabase.from("coach_services").select("*").eq("coach_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("physio_services").select("*").eq("physio_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("coach_reviews").select("rating").eq("coach_id", userId),
      ]);
      if (locData) {
        const locMap: Record<string, string[]> = {};
        locData.forEach(item => { if (!locMap[item.country]) locMap[item.country] = []; if (!locMap[item.country].includes(item.region)) locMap[item.country].push(item.region); });
        setLocationData(locMap);
      }
      if (prof) {
        setProfile(prof);
        setEditForm({
          first_name: prof.first_name ?? "",
          last_name: prof.last_name ?? "",
          handle: prof.handle ?? "",
          full_name: prof.full_name ?? "",
          headline: prof.headline ?? "",
          location: prof.location ?? "",
          country: prof.country ?? "",
          region: prof.region ?? "",
          bio: prof.bio ?? "",
          athlete_bio: prof.athlete_bio ?? "",
          avatar_url: prof.avatar_url ?? "",
          status_tag: prof.status_tag ?? "committed",
          display_sports: prof.display_sports ?? [],
          is_player: prof.is_player ?? true,
          is_coach: prof.is_coach ?? false,
          is_physio: prof.is_physio ?? false,
          height_cm: prof.height_cm ?? "",
          weight_kg: prof.weight_kg ?? "",
          show_physical_stats: prof.show_physical_stats ?? true,
          contact_email: prof.contact_email ?? "",
          contact_phone: prof.contact_phone ?? "",
          player_whatsapp: prof.player_whatsapp ?? "",
          player_phone_friends_only: prof.player_phone_friends_only ?? false,
          player_whatsapp_friends_only: prof.player_whatsapp_friends_only ?? false,
          address: prof.address ?? "",
          city_region: prof.city_region ?? "",
          coach_service_centre: prof.coach_service_centre ?? "",
          is_address_public: prof.is_address_public ?? true,
          instagram_url: prof.instagram_url ?? "",
          facebook_url: prof.facebook_url ?? "",
          threads_url: prof.threads_url ?? "",
          physio_rate: prof.physio_rate === 0 ? "" : (prof.physio_rate ?? ""),
          clinic_name: prof.clinic_name ?? "",
          physio_status: prof.physio_status ?? "hidden",
          physio_country: prof.physio_country ?? "",
          physio_region: prof.physio_region ?? "",
          physio_experience_years: prof.physio_experience_years ?? "",
          physio_qualifications: prof.physio_qualifications ?? "",
          physio_services_offered: prof.physio_services_offered ?? "",
          physio_service_tags: normalizePhysioProfileTags(prof.physio_service_tags, prof.physio_services_offered),
          physio_contact_email: prof.physio_contact_email ?? "",
          physio_contact_phone: prof.physio_contact_phone ?? "",
          physio_city_region: prof.physio_city_region ?? "",
          physio_address: prof.physio_address ?? "",
          physio_is_address_public: prof.physio_is_address_public ?? true,
          physio_instagram_url: prof.physio_instagram_url ?? "",
          physio_facebook_url: prof.physio_facebook_url ?? "",
          physio_threads_url: prof.physio_threads_url ?? "",
          districts: normalizeDistrictIds(prof.districts, prof.region),
          subdistricts: normalizeSubdistrictIds(prof.subdistricts),
          coach_districts: normalizeDistrictIds(prof.coach_districts, prof.city_region),
          coach_subdistricts: normalizeSubdistrictIds(prof.coach_subdistricts),
          coach_teaching_experience_years: prof.coach_teaching_experience_years ?? "",
          physio_districts: normalizeDistrictIds(prof.physio_districts, prof.physio_city_region),
          physio_subdistricts: normalizeSubdistrictIds(prof.physio_subdistricts),
        });
      }
      if (usData) setUserSports(usData as unknown as UserSport[]);
      if (sData) setAllSports(sData);
      if (teamsData) setUserTeams(teamsData as unknown as UserTeamRow[]);
      if (coachSvc) setCoachServices(coachSvc);
      if (physioSvc) setPhysioServices(physioSvc);
      if (reviewsData) setCoachReviews(reviewsData);
      const { data: files } = await supabase.storage.from("highlights").list(`${userId}/`, { limit: 20, sortBy: { column: "created_at", order: "desc" } });
      if (files && files.length > 0) {
        setGalleryMedia(files.filter(f => f.name !== ".emptyFolderPlaceholder").map(file => { const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(`${userId}/${file.name}`); return { id: file.id || file.name, sportName: "Highlight", type: "image" as const, url: urlData.publicUrl, fileName: file.name, createdAt: file.created_at ? new Date(file.created_at).toLocaleDateString() : "最近上傳" }; }));
      } else setGalleryMedia([]);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) { setUser(authUser); loadProfileData(authUser.id); } else setIsLoading(false);
    });
  }, [loadProfileData, supabase]);

  useEffect(() => {
    if (!isEditing || editForm.handle === profile?.handle || editForm.handle.length < 3) { setHandleStatus("idle"); return; }
    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      const { data } = await supabase.from("profiles").select("id").eq("handle", editForm.handle).neq("id", user?.id).maybeSingle();
      setHandleStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [editForm.handle, isEditing, user?.id, profile?.handle, supabase]);

  const onAvatarFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; const reader = new FileReader();
      reader.addEventListener("load", () => { setCropImageSrc(reader.result?.toString() || ""); setIsCropModalOpen(true); });
      reader.readAsDataURL(file);
    }
  }, []);

  const handleConfirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) return;
      const compressed = await compressImage(croppedBlob);
      pendingAvatarFile.current = compressed;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const localUrl = URL.createObjectURL(compressed); blobUrlRef.current = localUrl;
      setEditForm((prev: any) => ({ ...prev, avatar_url: localUrl }));
      setIsCropModalOpen(false); setCropImageSrc(null);
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!user || handleStatus === "taken") return;
    if (!window.confirm("確定要儲存您的個人檔案與專業資訊變更嗎？")) return;
    setIsSaving(true);
    let finalAvatarUrl = editForm.avatar_url;
    if (pendingAvatarFile.current) {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, pendingAvatarFile.current, { upsert: true });
      if (!uploadError) finalAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      pendingAvatarFile.current = null;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    }
    const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
    const physioRateVal = Number(editForm.physio_rate) || 0;
    const hkCountry = isHongKongCountry(editForm.country);
    const profileDistricts = hkCountry ? (Array.isArray(editForm.districts) ? editForm.districts : []) : [];
    const profileDistrictLabel = formatDistrictList(profileDistricts, 3);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      is_player: editForm.is_player,
      is_coach: editForm.is_coach,
      is_physio: editForm.is_physio,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      handle: editForm.handle,
      full_name: fullName,
      headline: editForm.headline,
      country: editForm.country,
      region: hkCountry ? (profileDistrictLabel || editForm.region) : editForm.region,
      location: hkCountry
        ? (profileDistrictLabel ? `${profileDistrictLabel}, ${editForm.country}` : editForm.country)
        : (editForm.region ? `${editForm.region}, ${editForm.country}` : editForm.country),
      districts: profileDistricts,
      subdistricts: normalizeSubdistrictIds(editForm.subdistricts),
      coach_districts: Array.isArray(editForm.coach_districts) ? editForm.coach_districts : [],
      coach_subdistricts: normalizeSubdistrictIds(editForm.coach_subdistricts),
      coach_teaching_experience_years: editForm.coach_teaching_experience_years
        ? Number(editForm.coach_teaching_experience_years)
        : null,
      bio: editForm.bio,
      athlete_bio: editForm.athlete_bio || null,
      avatar_url: finalAvatarUrl,
      status_tag: editForm.status_tag,
      display_sports: editForm.display_sports,
      height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
      weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
      show_physical_stats: editForm.show_physical_stats ?? true,
      contact_email: editForm.contact_email || null,
      contact_phone: editForm.contact_phone || null,
      player_whatsapp: editForm.player_whatsapp || null,
      player_phone_friends_only: editForm.player_phone_friends_only ?? false,
      player_whatsapp_friends_only: editForm.player_whatsapp_friends_only ?? false,
      address: editForm.address || null,
      coach_service_centre: editForm.coach_service_centre || null,
      city_region: formatDistrictList(Array.isArray(editForm.coach_districts) ? editForm.coach_districts : [], 3) || editForm.city_region || null,
      is_address_public: editForm.is_address_public ?? true,
      instagram_url: editForm.instagram_url || null,
      facebook_url: editForm.facebook_url || null,
      threads_url: editForm.threads_url || null,
      physio_rate: physioRateVal,
      clinic_name: editForm.clinic_name || null,
      physio_status: editForm.physio_status || "hidden",
      physio_country: editForm.physio_country || null,
      physio_region: editForm.physio_region || null,
      physio_experience_years: editForm.physio_experience_years || null,
      physio_qualifications: editForm.physio_qualifications || null,
      physio_services_offered: editForm.physio_service_tags?.length
        ? editForm.physio_service_tags.join("、")
        : editForm.physio_services_offered || null,
      physio_service_tags: editForm.physio_service_tags || [],
      physio_contact_email: editForm.physio_contact_email || null,
      physio_contact_phone: editForm.physio_contact_phone || null,
      physio_city_region: formatDistrictList(Array.isArray(editForm.physio_districts) ? editForm.physio_districts : [], 3) || editForm.physio_city_region || null,
      physio_districts: Array.isArray(editForm.physio_districts) ? editForm.physio_districts : [],
      physio_subdistricts: normalizeSubdistrictIds(editForm.physio_subdistricts),
      physio_address: editForm.physio_address || null,
      physio_is_address_public: editForm.physio_is_address_public ?? true,
      physio_instagram_url: editForm.physio_instagram_url || null,
      physio_facebook_url: editForm.physio_facebook_url || null,
      physio_threads_url: editForm.physio_threads_url || null,
    });
    if (!error) {
      setProfile(prev => ({ ...prev!, ...editForm, avatar_url: finalAvatarUrl, full_name: fullName, location: `${editForm.region}, ${editForm.country}` }));
      setIsEditing(false);
      await loadProfileData(user.id);
      alert("✅ 儲存成功！您的個人資料已更新。");
      router.refresh();
    } else {
      console.error("Save Error:", error);
      alert("❌ 同步失敗，請開啟瀏覽器主控台 (F12 Console) 檢查錯誤詳情。");
    }
    setIsSaving(false);
  };

  const toggleDisplaySport = (sportName: string) => {
    setEditForm((prev: any) => { let current = [...prev.display_sports]; if (current.includes(sportName)) current = current.filter(s => s !== sportName); else { if (current.length >= 3) current.shift(); current.push(sportName); } return { ...prev, display_sports: current }; });
  };

  const resolveSportId = useCallback(
    (slug: SportCategoryId) =>
      allSports.find((s) => normalizeSportCategory(s.name) === slug)?.id ?? null,
    [allSports]
  );

  const handleOpenSportModal = useCallback((us?: UserSport) => {
    if (us) {
      const slug = normalizeSportCategory(us.sports?.name) || "";
      setSelectedSportSlug(slug);
      setSportDynamicData(sportFormDataFromMetadata(us.metadata as Record<string, unknown>, slug));
      setEditingUserSportId(us.id);
    } else {
      setSelectedSportSlug("");
      setSportDynamicData({});
      setEditingUserSportId(null);
    }
    setIsSportModalOpen(true);
  }, []);

  const handleSaveSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSportSlug || !user) return;
    const sportId = resolveSportId(selectedSportSlug);
    if (!sportId) {
      alert("此運動項目尚未在資料庫中設定，請聯絡管理員或執行最新 migration。");
      return;
    }
    const metadata = normalizeSportMetadataForSave(sportDynamicData, selectedSportSlug);
    const incomplete = sportFormHasEmptyFields(sportDynamicData, selectedSportSlug);
    if (editingUserSportId) await supabase.from("user_sports").update({ sport_id: sportId, metadata }).eq("id", editingUserSportId);
    else await supabase.from("user_sports").insert({ user_id: user.id, sport_id: sportId, metadata, sort_order: userSports.length + 1 });
    await loadProfileData(user.id);
    setIsSportModalOpen(false);
    router.refresh();
    if (incomplete) {
      alert("已儲存！建議填寫完整技術資料（年資、位置等），可大幅提升在人脈搜尋中的曝光率。");
    }
  };

  const handleRemoveSport = async (us: UserSport) => {
    if (!window.confirm(`確定要移除 ${us.sports?.name} 嗎？`)) return;
    await supabase.from("user_sports").delete().eq("id", us.id);
    setUserSports(prev => prev.filter(item => item.id !== us.id)); router.refresh();
  };

  const handleMoveSport = async (id: string, direction: "up" | "down") => {
    if (!userSports.length) return;
    const idx = userSports.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= userSports.length) return;

    const a = userSports[idx];
    const b = userSports[swapIdx];
    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? swapIdx + 1;
    await Promise.all([
      supabase.from("user_sports").update({ sort_order: bOrder }).eq("id", a.id),
      supabase.from("user_sports").update({ sort_order: aOrder }).eq("id", b.id),
    ]);
    if (user) await loadProfileData(user.id);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]; if (!rawFile || !uploadMediaSport || !user) return;
    setIsUploadingMedia(true);
    const fileToUpload = await compressImage(rawFile);
    const uniqueFileName = `highlight-${Date.now()}.${rawFile.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("highlights").upload(`${user.id}/${uniqueFileName}`, fileToUpload);
    if (!error) { const publicUrl = supabase.storage.from("highlights").getPublicUrl(`${user.id}/${uniqueFileName}`).data.publicUrl; setGalleryMedia(prev => [{ id: uniqueFileName, sportName: uploadMediaSport, type: "image", url: publicUrl, fileName: uniqueFileName, createdAt: "剛剛" }, ...prev]); }
    setIsMediaModalOpen(false); setUploadMediaSport(""); setIsUploadingMedia(false); router.refresh();
  };

  const handleDeleteMedia = async (post: MediaItem) => {
    if (!user || !post.fileName) return; if (!window.confirm("確定刪除此影像？")) return;
    await supabase.storage.from("highlights").remove([`${user.id}/${post.fileName}`]);
    setGalleryMedia(prev => prev.filter(m => m.id !== post.id)); setSelectedPost(null); router.refresh();
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入總部中...</div>;
  const avatarSrc = editForm.avatar_url || profile?.avatar_url || "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label="返回首頁" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

          {/* ── Left sidebar ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>{!avatarSrc && (profile?.first_name?.[0] || profile?.full_name?.[0] || "PRO")}</div>
                {isEditing && <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center text-white text-xs font-bold border border-dashed border-slate-400">📸 換照片</button>}
                <input type="file" ref={avatarInputRef} onChange={onAvatarFileChange} accept="image/*" className="hidden" />
                <div className="absolute -bottom-3 -right-6 z-20"><StatusBadge tag={isEditing ? editForm.status_tag : profile?.status_tag ?? null} /></div>
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">名 First</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">姓 Last</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Unique Handle</label><input className={`w-full bg-slate-950/50 border rounded-xl p-3 text-white text-sm ${handleStatus === "taken" ? "border-red-500" : "border-slate-800"}`} value={editForm.handle} onChange={e => setEditForm({ ...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} placeholder="ID 帳號" /></div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Headline</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.headline} onChange={e => setEditForm({ ...editForm, headline: e.target.value })} placeholder="例如: 網球底線玩家" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">身高 (cm)</label><input type="number" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.height_cm} onChange={e => setEditForm({ ...editForm, height_cm: e.target.value })} placeholder="例: 178" /></div>
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">體重 (kg)</label><input type="number" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.weight_kg} onChange={e => setEditForm({ ...editForm, weight_kg: e.target.value })} placeholder="例: 70" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">國家</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value, region: "", districts: [], subdistricts: [] })}><option value="">選擇國家</option>{Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    {!isHongKongCountry(editForm.country) && (
                      <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">地區</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })}><option value="">選擇區域</option>{editForm.country && locationData[editForm.country]?.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    )}
                  </div>
                  {isHongKongCountry(editForm.country) && (
                    <div className="space-y-1.5 p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">香港地區（可多選）</label>
                      <HKDistrictPicker
                        districts={editForm.districts || []}
                        subdistricts={editForm.subdistricts || []}
                        onDistrictsChange={() => {}}
                        onSubdistrictsChange={() => {}}
                        onSelectionChange={(d, s) => setEditForm((prev: any) => ({ ...prev, districts: d, subdistricts: s }))}
                        hideSectionTitle
                        minDistricts={0}
                      />
                    </div>
                  )}
                  
                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-4 mt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase pl-1 block mb-2">運動員/一般狀態</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs" value={editForm.status_tag} onChange={e => setEditForm((prev: any) => ({ ...prev, status_tag: e.target.value }))}>
                        <option value="recruiting">🟢 尋找新血</option>
                        <option value="seeking_team">🔵 尋找隊伍</option>
                        <option value="open_to_match">🟡 開放約戰</option>
                        <option value="committed">⚪ 穩定狀態</option>
                        <option value="hidden">🔒 未發布 (隱藏中)</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.show_physical_stats} onChange={e => setEditForm((prev: any) => ({ ...prev, show_physical_stats: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-zinc-300">公開展示身高體重數據</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_player} onChange={e => setEditForm((prev: any) => ({ ...prev, is_player: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-blue-400">開啟運動員球員檔案</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_coach} onChange={e => setEditForm((prev: any) => ({ ...prev, is_coach: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-amber-400">開啟教練管理功能</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_physio} onChange={e => setEditForm((prev: any) => ({ ...prev, is_physio: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-emerald-400">開啟運動/物理治療功能</span></label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving || handleStatus === "taken"} className="flex-1 bg-slate-50 hover:bg-slate-200 text-black font-black py-3 rounded-xl disabled:opacity-50">{isSaving ? "同步中..." : "完成變更"}</button>
                    <button onClick={() => { setIsEditing(false); if (user) loadProfileData(user.id); }} className="px-4 bg-slate-800 text-zinc-300 font-bold rounded-xl hover:bg-slate-700">取消</button>
                  </div>
                </div>
              ) : (
                <div className="text-center animate-fadeIn mt-2">
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">{profile?.first_name} {profile?.last_name}</h1>
                  <p className="text-sm font-mono text-blue-400 mb-2">@{profile?.handle || "ID_未設定"}</p>

                  {profile?.is_player !== false && profile?.show_physical_stats && (profile?.height_cm || profile?.weight_kg) && (
                    <div className="flex items-center justify-center gap-4 px-4 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-mono text-zinc-400 mb-4 mx-auto w-fit shadow-inner">
                      {profile.height_cm && <span>📏 {profile.height_cm} cm</span>}
                      {profile.weight_kg && <span className={profile.height_cm ? "border-l border-slate-700 pl-4" : ""}>⚖️ {profile.weight_kg} kg</span>}
                    </div>
                  )}

                  <p className="text-sm font-bold text-zinc-400 mb-4">{profile?.headline || "設定你的場上宣言"}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {profile?.is_player !== false && <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20">👤 運動員</span>}
                    {profile?.is_coach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20">🎓 教練</span>}
                    {profile?.is_physio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">⚕️ 物理治療</span>}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">{profile?.bio || "寫下一段關於你的歷程..."}</p>

                  <div className="flex flex-col gap-3">
                    <button onClick={() => setIsEditing(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">✏️ 編輯基礎檔案與身份</button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => router.push(`/p/${user?.id}`)} className="w-full bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600 hover:text-white text-blue-400 font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs">👁️ 預覽公開名片</button>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${user?.id}`); alert("名片網址已複製！"); }} className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-zinc-300 font-bold py-3 rounded-xl transition text-xs">分享連結 ↗</button>
                    </div>
                  </div>

                  {/* ── Private backend navigation ── */}
                  <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1 text-left">專屬後台 (Backend)</p>

                    <button onClick={() => handlePrivateTabSwitch("friends")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${privateTab === "friends" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900/50 text-zinc-400 hover:bg-slate-800 hover:text-white"}`}>
                      <span className="flex items-center gap-3"><span className="text-lg">👥</span> 好友管理</span><span className="text-xs">→</span>
                    </button>

                    <button onClick={() => handlePrivateTabSwitch("account")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${privateTab === "account" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900/50 text-zinc-400 hover:bg-slate-800 hover:text-white"}`}>
                      <span className="flex items-center gap-3"><span className="text-lg">⚙️</span> 帳戶管理</span><span className="text-xs">→</span>
                    </button>

                    {userTeams.length > 0 && (
                      <button onClick={() => handlePrivateTabSwitch("teams")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${privateTab === "teams" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900/50 text-zinc-400 hover:bg-slate-800 hover:text-white"}`}>
                        <span className="flex items-center gap-3"><span className="text-lg">🛡️</span> 我的團隊</span><span className="text-xs">→</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right content ── */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col" ref={contentRef}>
            {privateTab ? (
              <>
                <div className="bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl flex items-center justify-between w-full mb-8 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl">
                      {privateTab === "friends" && "👥"}
                      {privateTab === "teams" && "🛡️"}
                      {privateTab === "account" && "⚙️"}
                      {privateTab === "dashboard" && "👤"}
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-black text-white leading-tight">
                        {privateTab === "friends" && "好友管理"}
                        {privateTab === "teams" && "我的團隊"}
                        {privateTab === "account" && "帳戶管理"}
                        {privateTab === "dashboard" && "運動員專屬後台管理"}
                      </h2>
                      <p className="text-[10px] text-zinc-400 font-bold tracking-wider mt-0.5">專屬私密空間</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReturnToPreview}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-zinc-300 hover:text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="hidden sm:inline">返回公開預覽</span><span className="sm:hidden">返回</span> ↗
                  </button>
                </div>

                <div className="flex-1">
                  {privateTab === "dashboard" && (
                    <DashboardTab
                      editForm={editForm}
                      isSaving={isSaving}
                      onFieldChange={(key, value) => setEditForm((prev: any) => ({ ...prev, [key]: value }))}
                      onSave={handleSaveProfile}
                    />
                  )}
                  {privateTab === "friends" && user && (
                    <div className="animate-fadeIn">
                      <div className="mb-6 px-2"><h2 className="text-lg md:text-xl font-black text-white">好友管理</h2><p className="text-xs text-zinc-500 mt-1">管理你的好友、待接受請求與已發送請求。</p></div>
                      <FriendsTab currentUserId={user.id} />
                    </div>
                  )}
                  {privateTab === "account" && user && (
                    <AccountManagementTab userEmail={user.email} identities={user.identities} />
                  )}
                  {privateTab === "teams" && (() => {
                    const managedTeams = userTeams.filter(t => t.role === "admin" && t.teams);
                    const joinedTeams = userTeams.filter(t => t.role !== "admin" && t.teams);
                    const hasBoth = managedTeams.length > 0 || joinedTeams.length > 0;
                    return (
                      <div className="animate-fadeIn space-y-8">
                        <div className="flex items-center justify-between mb-2">
                          <div><h2 className="text-lg md:text-xl font-black text-white">我的團隊</h2><p className="text-xs text-zinc-500 mt-1">管理你建立或加入的所有團隊。</p></div>
                          <a href="/team/create" className="flex-shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-[0_0_10px_rgba(217,119,6,0.2)] transition-all active:scale-95">＋ 建立團隊</a>
                        </div>
                        {!hasBoth && <div className="bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl py-16 text-center px-6"><p className="text-4xl mb-4">🛡️</p><p className="text-zinc-400 font-bold text-sm mb-2">你尚未加入或建立任何團隊</p><a href="/team/create" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.2)]">＋ Create Team / Group</a></div>}
                        {managedTeams.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 pl-1">我管理的團隊 (Admin)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {managedTeams.map(({ teams: t }) => {
                                if (!t) return null;
                                const emoji = TEAM_SPORT_EMOJI[t.sport_category] ?? "🏅";
                                const zh = TEAM_SPORT_ZH[t.sport_category] ?? t.sport_category;
                                const name = t.name_en || t.name_zh || "Unnamed";
                                return (
                                  <div key={t.id} className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start">
                                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-black text-zinc-500 flex-shrink-0 overflow-hidden bg-cover bg-center" style={t.logo_url ? { backgroundImage: `url(${t.logo_url})` } : undefined}>{!t.logo_url && (name[0] || "T")}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-white truncate">{name}</p>
                                      <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3"><span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{emoji} {zh}</span></div>
                                      <div className="flex gap-2">
                                        <a href={`/team/${t.id}`} className="flex-1 text-center text-xs font-bold py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-200 transition">查看頁面</a>
                                        <a href={`/team/${t.id}/admin`} className="flex-1 text-center text-xs font-black py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition">⚙️ 管理</a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {joinedTeams.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-1">我加入的團隊</p>
                            <div className="space-y-3">
                              {joinedTeams.map(({ teams: t }) => {
                                if (!t) return null;
                                const emoji = TEAM_SPORT_EMOJI[t.sport_category] ?? "🏅";
                                const zh = TEAM_SPORT_ZH[t.sport_category] ?? t.sport_category;
                                const name = t.name_en || t.name_zh || "Unnamed";
                                return (
                                  <a key={t.id} href={`/team/${t.id}`} className="flex items-center gap-4 bg-slate-900/40 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 transition group">
                                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-black text-zinc-500 flex-shrink-0 overflow-hidden bg-cover bg-center" style={t.logo_url ? { backgroundImage: `url(${t.logo_url})` } : undefined}>{!t.logo_url && (name[0] || "T")}</div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-black text-white truncate group-hover:text-amber-400 transition">{name}</p><p className="text-xs text-zinc-500">{emoji} {zh}</p></div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : profile ? (
              <ProfileRolePreview
                profile={profile}
                activeRole={activeRole}
                onRoleChange={setActiveRole}
                activeAthleteTab={activeAthleteTab}
                onAthleteTabChange={setActiveAthleteTab}
                showPlayer={showPlayer}
                showCoach={showCoach}
                showPhysio={showPhysio}
                coachServices={coachServices}
                physioServices={physioServices}
                coachReviews={coachReviews}
                onCoachBackend={showCoach ? () => router.push("/dashboard/coach") : undefined}
                onPhysioBackend={showPhysio ? () => router.push("/dashboard/physio") : undefined}
                onAthleteBackend={showPlayer ? () => setPrivateTab("dashboard") : undefined}
                athleteExpertise={
                  <ExpertiseTab
                    userSports={userSports}
                    editFormDisplaySports={editForm.display_sports}
                    onToggleDisplaySport={toggleDisplaySport}
                    onOpenSportModal={handleOpenSportModal}
                    onRemoveSport={handleRemoveSport}
                    onSaveDisplaySports={handleSaveProfile}
                    onMoveSport={handleMoveSport}
                  />
                }
                athleteHighlights={
                  <HighlightsTab
                    galleryMedia={galleryMedia}
                    userSports={userSports}
                    onSelectPost={setSelectedPost}
                    onOpenMediaModal={() => setIsMediaModalOpen(true)}
                  />
                }
                athleteFeed={<FeedTab profile={profile} avatarSrc={avatarSrc} />}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Crop Modal ── */}
      {isCropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[400px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6"><Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={(_, px) => setCroppedAreaPixels(px as any)} onZoomChange={setZoom} /></div>
          <div className="w-full max-w-md flex gap-4"><button onClick={() => { setIsCropModalOpen(false); setCropImageSrc(null); }} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">取消</button><button onClick={handleConfirmCrop} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">確認裁切</button></div>
        </div>
      )}

      {/* ── Sport Modal ── */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white mb-6">{editingUserSportId ? "編輯技術特長" : "添入技術特長"}</h3>
            <form onSubmit={handleSaveSport} className="space-y-5 text-sm">
              <p className="text-xs text-blue-300/90 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
                💡 僅運動項目為必填。其餘欄位選填，但填寫越完整，在人脈搜尋與配對中的曝光率越高。
              </p>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">選擇運動項目</label>
                <SportCategoryPicker
                  value={selectedSportSlug}
                  onChange={(id: SportCategoryId) => { setSelectedSportSlug(id); setSportDynamicData({}); }}
                />
              </div>
              {selectedSportSlug && getSportSchema(selectedSportSlug).map(field => (
                <div key={field.key} className="animate-fadeIn">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">
                    {field.label}{field.unit && ` (${field.unit})`} (選填)
                  </label>
                  {field.type === "select" && field.multi ? (
                    <SportPositionPicker
                      options={field.options || []}
                      value={Array.isArray(sportDynamicData[field.key]) ? sportDynamicData[field.key] as string[] : []}
                      onChange={(positions) => setSportDynamicData({ ...sportDynamicData, [field.key]: positions })}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={(sportDynamicData[field.key] as string) || ""}
                      onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none"
                    >
                      <option value="">-- 請選擇 --</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={(sportDynamicData[field.key] as string) || ""}
                      onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none"
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsSportModalOpen(false)} className="flex-1 bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl">取消</button><button type="submit" disabled={!selectedSportSlug} className="flex-1 bg-slate-50 text-black font-black py-3 rounded-xl">{editingUserSportId ? "儲存" : "加入"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── Media Modal ── */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">歸檔雲端賽事影音</h3>
            <div className="space-y-5 text-sm">
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">1. 歸屬類別</label><select value={uploadMediaSport} onChange={e => setUploadMediaSport(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none"><option value="">-- 選擇專長 --</option>{userSports.map(us => <option key={us.id} value={us.sports?.name}>{us.sports?.name}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">2. 選擇檔案</label><div className="border-2 border-dashed border-slate-800 hover:border-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden"><input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" /><span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span></div></div>
              <button onClick={() => setIsMediaModalOpen(false)} className="w-full bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl mt-2">關閉視窗</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post lightbox ── */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 md:p-8 animate-fadeIn">
          <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white text-3xl font-black z-50 hover:scale-110">×</button>
          <div className="w-full max-w-6xl max-h-[100dvh] md:max-h-[85vh] bg-slate-950 md:rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-800 shadow-2xl">
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0"><img src={selectedPost.url} alt="Post highlight" className="max-w-full max-h-[85vh] object-contain" /></div>
            <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-full bg-slate-950">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-700 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div><p className="text-sm font-black text-white">{profile?.handle || profile?.first_name}</p></div></div>
                <button onClick={() => handleDeleteMedia(selectedPost)} className="text-red-400 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-lg">刪除</button>
              </div>
              <div className="flex-1 p-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePageWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageWithSuspense), { ssr: false });