"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeSupabaseQuery } from "@/lib/supabase/safe-query";
import { useAuth } from "@/components/SupabaseProvider";
import { ImageCropModal } from "@/components/media/ImageCropModal";
import { readFileAsDataUrl } from "@/lib/image-crop";
import { BackButton } from "@/components/BackButton";
import { FriendsTab } from "@/components/FriendsTab";
import { DashboardTab } from "@/components/profile/DashboardTab";
import { FeedTab } from "@/components/profile/FeedTab";
import { ExpertiseTab } from "@/components/profile/ExpertiseTab";
import { HighlightsTab } from "@/components/profile/HighlightsTab";
import { ProfileRolePreview, type AthleteSubTab, type ProfileRole } from "@/components/profile/ProfileRolePreview";
import { getSportSchema } from "@/constants/sportsSchema";
import { getSportCategory, normalizeSportCategory, type SportCategoryId } from "@/lib/sports-categories";
import { normalizePhysioProfileTags } from "@/lib/physio-service-types";
import { stripHtml, PROFILE_CARD_BIO_MAX } from "@/lib/content/body";
import { enquiryServiceIdsWithUncontacted } from "@/lib/service-enquiry";
import { SportCategoryPicker } from "@/components/sports/SportCategoryPicker";
import { SportPositionPicker } from "@/components/sports/SportPositionPicker";
import { normalizeSportMetadataForSave, sportFormDataFromMetadata, sportFormHasEmptyFields } from "@/lib/sport-positions";
import {
  formatDistrictList,
  isHongKongCountry,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { mapHighlightGalleryFiles } from "@/lib/highlights-gallery";
import { type ProfileGender } from "@/lib/gender";
import { parseProfileAgeInput } from "@/lib/profile-age";
import { CoachRoleLabel, PhysioRoleLabel } from "@/components/profile/RoleBadges";
import { ProfilePhysicalStatsRow } from "@/components/profile/ProfilePhysicalStatsRow";
import { ProfileCardBio } from "@/components/profile/ProfileCardBio";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";
import { ProfileHubTopActions, ProfileHubMobileBar } from "@/components/profile/ProfileHubBar";
import { ProfileHubTabNav, type ProfileHubTabId } from "@/components/profile/ProfileHubTabNav";
import { ProfileSettingsList } from "@/components/profile/ProfileSettingsList";
import { ProfileEditTab } from "@/components/profile/ProfileEditTab";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { MyEventsTab } from "@/components/profile/MyEventsTab";
import { toast } from "sonner";
import { appConfirm } from "@/lib/app-dialog";
import { FormSelect } from "@/components/ui/form-select";

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
  player_email_friends_only: boolean | null;
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
  gender?: ProfileGender | null;
  age?: number | null;
  show_age?: boolean | null;
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

type PrivateTabId = "home" | "dashboard" | "edit" | "friends" | "teams" | "settings" | "events";

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
  player_phone_friends_only: true,
  player_whatsapp_friends_only: true,
  player_email_friends_only: true,
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
  gender: "" as ProfileGender | "",
  age: "",
  show_age: false,
  physio_districts: [] as string[],
  physio_subdistricts: [] as string[],
};

const StatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "hidden" || tag === "draft") return <div className="inline-flex items-center gap-1.5 bg-slate-800 text-zinc-500 text-[10px] px-2.5 py-1 rounded-full font-black border border-slate-700">🔒 未發布 (隱藏中)</div>;
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生/招募中</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> 開放約戰</div>;
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy" || tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員/滿診</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

function ProfilePageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const loadGenerationRef = useRef(0);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingAvatarFile = useRef<File | Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [privateTab, setPrivateTab] = useState<PrivateTabId>("home");
  const [activeRole, setActiveRole] = useState<ProfileRole>("athlete");
  const [activeAthleteTab, setActiveAthleteTab] = useState<AthleteSubTab>("expertise");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>(DEFAULT_FORM);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [locationData, setLocationData] = useState<Record<string, string[]>>({});

  const [cropTarget, setCropTarget] = useState<"avatar" | "highlight" | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const pendingHighlightSport = useRef<string | null>(null);
  const highlightUploadLockRef = useRef(false);

  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportSlug, setSelectedSportSlug] = useState<SportCategoryId | "">("");
  const [sportDynamicData, setSportDynamicData] = useState<Record<string, string | string[]>>({});
  const [editingUserSportId, setEditingUserSportId] = useState<string | null>(null);
  const [sportModalInitialSlug, setSportModalInitialSlug] = useState<SportCategoryId | "">("");

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [uploadMediaSport, setUploadMediaSport] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<MediaItem | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeamRow[]>([]);
  const [coachServices, setCoachServices] = useState<any[]>([]);
  const [physioServices, setPhysioServices] = useState<any[]>([]);
  const [coachReviews, setCoachReviews] = useState<{ rating: number }[]>([]);
  const [uncontactedCoachEnquiries, setUncontactedCoachEnquiries] = useState(0);
  const [uncontactedPhysioEnquiries, setUncontactedPhysioEnquiries] = useState(0);
  const [uncontactedCoachServiceIds, setUncontactedCoachServiceIds] = useState<string[]>([]);
  const [uncontactedPhysioServiceIds, setUncontactedPhysioServiceIds] = useState<string[]>([]);

  useEffect(() => {
    const tabQuery = searchParams?.get("tab");
    const viewQuery = searchParams?.get("view");

    if (tabQuery === "account") {
      router.replace("/profile/settings/account");
      return;
    }

    if (tabQuery && ["dashboard", "edit", "friends", "teams", "settings", "events"].includes(tabQuery)) {
      setPrivateTab(tabQuery as PrivateTabId);
    } else if (viewQuery === "coach") {
      setPrivateTab("home");
      setActiveRole("coach");
    } else if (viewQuery === "physio") {
      setPrivateTab("home");
      setActiveRole("physio");
    } else if (viewQuery === "expertise" || viewQuery === "highlights" || viewQuery === "feed") {
      setPrivateTab("home");
      setActiveRole("athlete");
      setActiveAthleteTab(viewQuery as AthleteSubTab);
    } else {
      setPrivateTab("home");
    }
  }, [searchParams, router]);

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
    if (tab === "home") {
      router.replace("/profile", { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.replace(`/profile?tab=${tab}`, { scroll: false });
    if (window.innerWidth < 1024 && contentRef.current) {
      const y = contentRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [router]);

  const handleReturnToPreview = useCallback(() => {
    setPrivateTab("home");
    router.replace("/profile", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const handleShareProfile = useCallback(() => {
    if (!user?.id) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${user.id}`);
    toast.success("名片網址已複製！");
  }, [user?.id]);

  const loadProfileData = useCallback(async (userId: string) => {
    const generation = ++loadGenerationRef.current;
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
        { count: uncontactedCoachCount },
        { count: uncontactedPhysioCount },
        { data: uncontactedCoachServiceRows },
        { data: uncontactedPhysioServiceRows },
      ] = await Promise.all([
        safeSupabaseQuery(supabase.from("profiles").select("*").eq("id", userId).single()),
        safeSupabaseQuery(supabase.from("user_sports").select("id, sport_id, metadata, sort_order, sports(name)").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true })),
        safeSupabaseQuery(supabase.from("sports").select("*").order("name", { ascending: true })),
        safeSupabaseQuery(supabase.from("locations").select("country, region")),
        safeSupabaseQuery(supabase.from("team_members").select("role, joined_at, teams(id, name_en, name_zh, sport_category, recruitment_status, logo_url)").eq("user_id", userId)),
        safeSupabaseQuery(supabase.from("coach_services").select("*").eq("coach_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true })),
        safeSupabaseQuery(supabase.from("physio_services").select("*").eq("physio_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true })),
        safeSupabaseQuery(supabase.from("coach_reviews").select("rating").eq("coach_id", userId)),
        safeSupabaseQuery(supabase.from("coach_enquiries").select("id", { count: "exact", head: true }).eq("coach_id", userId).neq("status", "contacted")),
        safeSupabaseQuery(supabase.from("physio_enquiries").select("id", { count: "exact", head: true }).eq("physio_id", userId).neq("status", "contacted")),
        safeSupabaseQuery(supabase.from("coach_enquiries").select("service_id, status").eq("coach_id", userId).neq("status", "contacted")),
        safeSupabaseQuery(supabase.from("physio_enquiries").select("service_id, status").eq("physio_id", userId).neq("status", "contacted")),
      ]);
      if (generation !== loadGenerationRef.current) return;
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
          bio: stripHtml(prof.bio ?? ""),
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
          player_phone_friends_only: prof.player_phone_friends_only ?? true,
          player_whatsapp_friends_only: prof.player_whatsapp_friends_only ?? true,
          player_email_friends_only: prof.player_email_friends_only ?? true,
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
          gender: (prof.gender === "male" || prof.gender === "female" ? prof.gender : "") as ProfileGender | "",
          age: prof.age != null ? String(prof.age) : "",
          show_age: prof.show_age ?? false,
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
      setUncontactedCoachEnquiries(uncontactedCoachCount ?? 0);
      setUncontactedPhysioEnquiries(uncontactedPhysioCount ?? 0);
      setUncontactedCoachServiceIds(enquiryServiceIdsWithUncontacted(uncontactedCoachServiceRows));
      setUncontactedPhysioServiceIds(enquiryServiceIdsWithUncontacted(uncontactedPhysioServiceRows));
      const { data: files } = await safeSupabaseQuery(
        supabase.storage.from("highlights").list(`${userId}/`, { limit: 20, sortBy: { column: "created_at", order: "desc" } })
      );
      if (generation !== loadGenerationRef.current) return;
      setGalleryMedia(files ? mapHighlightGalleryFiles(supabase, userId, files) : []);
    } catch (err) { console.error(err); } finally {
      if (generation === loadGenerationRef.current) setIsLoading(false);
    }
  }, [supabase]);

  const handleCancelEdit = useCallback(() => {
    if (user) loadProfileData(user.id);
    handleReturnToPreview();
  }, [user, loadProfileData, handleReturnToPreview]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadProfileData(user.id);
  }, [user?.id, authLoading, loadProfileData]);

  useEffect(() => {
    if (!user?.id) return;
    const refreshEnquiries = () => loadProfileData(user.id);
    const onFocus = () => refreshEnquiries();
    const onCoachSync = () => refreshEnquiries();
    const onPhysioSync = () => refreshEnquiries();
    window.addEventListener("focus", onFocus);
    window.addEventListener("sync-coach-enquiries", onCoachSync);
    window.addEventListener("sync-physio-enquiries", onPhysioSync);

    const channel = supabase
      .channel(`profile-enquiries-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_enquiries", filter: `coach_id=eq.${user.id}` },
        refreshEnquiries
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "physio_enquiries", filter: `physio_id=eq.${user.id}` },
        refreshEnquiries
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("sync-coach-enquiries", onCoachSync);
      window.removeEventListener("sync-physio-enquiries", onPhysioSync);
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, loadProfileData]);

  useEffect(() => {
    if (privateTab !== "edit" || editForm.handle === profile?.handle || editForm.handle.length < 3) { setHandleStatus("idle"); return; }
    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      const { data } = await supabase.from("profiles").select("id").eq("handle", editForm.handle).neq("id", user?.id).maybeSingle();
      setHandleStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [editForm.handle, privateTab, user?.id, profile?.handle, supabase]);

  const closeCropModal = useCallback(() => {
    setCropTarget(null);
    setCropImageSrc(null);
    pendingHighlightSport.current = null;
    highlightUploadLockRef.current = false;
  }, []);

  const onAvatarFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropImageSrc(await readFileAsDataUrl(file));
    setCropTarget("avatar");
  }, []);

  const handleCropConfirm = async (file: File) => {
    if (cropTarget === "avatar") {
      pendingAvatarFile.current = file;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const localUrl = URL.createObjectURL(file);
      blobUrlRef.current = localUrl;
      setEditForm((prev: any) => ({ ...prev, avatar_url: localUrl }));
      closeCropModal();
      return;
    }

    if (cropTarget === "highlight" && pendingHighlightSport.current && user) {
      if (highlightUploadLockRef.current) return;
      highlightUploadLockRef.current = true;
      const sportName = pendingHighlightSport.current;
      setIsUploadingMedia(true);
      try {
        const uniqueFileName = `highlight-${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("highlights")
          .upload(`${user.id}/${uniqueFileName}`, file);
        if (!error) {
          const publicUrl = supabase.storage
            .from("highlights")
            .getPublicUrl(`${user.id}/${uniqueFileName}`).data.publicUrl;
          setGalleryMedia((prev) => [
            {
              id: uniqueFileName,
              sportName,
              type: "image",
              url: publicUrl,
              fileName: uniqueFileName,
              createdAt: "剛剛",
            },
            ...prev,
          ]);
        }
        setIsMediaModalOpen(false);
        setUploadMediaSport("");
        router.refresh();
      } finally {
        setIsUploadingMedia(false);
        highlightUploadLockRef.current = false;
        closeCropModal();
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user || handleStatus === "taken") return;
    if (!(await appConfirm({ message: "確定要儲存您的個人檔案與專業資訊變更嗎？" }))) return;
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
      bio: (editForm.bio || "").replace(/<[^>]+>/g, "").slice(0, PROFILE_CARD_BIO_MAX) || null,
      athlete_bio: editForm.athlete_bio || null,
      avatar_url: finalAvatarUrl,
      status_tag: editForm.status_tag,
      display_sports: editForm.display_sports,
      height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
      weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : null,
      show_physical_stats: editForm.show_physical_stats ?? true,
      gender: editForm.gender || null,
      age: parseProfileAgeInput(String(editForm.age ?? "")),
      show_age: editForm.show_age ?? false,
      contact_email: editForm.contact_email || null,
      contact_phone: editForm.contact_phone || null,
      player_whatsapp: editForm.player_whatsapp || null,
      player_phone_friends_only: editForm.player_phone_friends_only ?? true,
      player_whatsapp_friends_only: editForm.player_whatsapp_friends_only ?? true,
      player_email_friends_only: editForm.player_email_friends_only ?? true,
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
      await loadProfileData(user.id);
      toast.success("儲存成功！您的個人資料已更新。");
      handleReturnToPreview();
      router.refresh();
    } else {
      console.error("Save Error:", error);
      toast.error("同步失敗，請開啟瀏覽器主控台 (F12 Console) 檢查錯誤詳情。");
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
      const formData = sportFormDataFromMetadata(us.metadata as Record<string, unknown>, slug);
      setSelectedSportSlug(slug);
      setSportDynamicData(formData);
      setSportModalInitialSlug(slug);
      setEditingUserSportId(us.id);
    } else {
      setSelectedSportSlug("");
      setSportDynamicData({});
      setSportModalInitialSlug("");
      setEditingUserSportId(null);
    }
    setIsSportModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isSportModalOpen || !editingUserSportId) return;
    const us = userSports.find((s) => s.id === editingUserSportId);
    if (!us) return;
    const slug = normalizeSportCategory(us.sports?.name) || "";
    if (!slug) return;
    setSelectedSportSlug(slug);
    setSportModalInitialSlug(slug);
    setSportDynamicData(sportFormDataFromMetadata(us.metadata as Record<string, unknown>, slug));
  }, [isSportModalOpen, editingUserSportId, userSports]);

  const handleSaveSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSportSlug || !user) return;
    const sportId = resolveSportId(selectedSportSlug);
    if (!sportId) {
      toast.error("此運動項目尚未在資料庫中設定，請聯絡管理員或執行最新 migration。");
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
      toast.success("已儲存！建議填寫完整技術資料（年資、位置等），可大幅提升在人脈搜尋中的曝光率。");
    }
  };

  const handleRemoveSport = async (us: UserSport) => {
    if (!(await appConfirm({ message: `確定要移除 ${us.sports?.name} 嗎？`, destructive: true }))) return;
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
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile || !uploadMediaSport || !user) return;
    if (cropTarget !== null || isUploadingMedia || highlightUploadLockRef.current) return;
    pendingHighlightSport.current = uploadMediaSport;
    setCropImageSrc(await readFileAsDataUrl(rawFile));
    setCropTarget("highlight");
  };

  const handleDeleteMedia = async (post: MediaItem) => {
    if (!user || !post.fileName) return;
    if (!(await appConfirm({ message: "確定刪除此影像？", destructive: true }))) return;
    await supabase.storage.from("highlights").remove([`${user.id}/${post.fileName}`]);
    setGalleryMedia(prev => prev.filter(m => m.id !== post.id)); setSelectedPost(null); router.refresh();
  };

  if (authLoading || isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入總部中...</div>;
  const avatarSrc = editForm.avatar_url || profile?.avatar_url || "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <div className="hidden lg:block">
          <BackButton label="返回首頁" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 mt-1 lg:mt-4">

          {/* ── Profile card ── */}
          <div className="order-1 lg:col-span-4 xl:col-span-3">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 lg:sticky lg:top-20 shadow-2xl">
              <ProfileHubTopActions userId={user?.id} onShare={handleShareProfile} />

              <div className="relative w-32 h-32 mx-auto mb-6 overflow-visible">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>{!avatarSrc && (profile?.first_name?.[0] || profile?.full_name?.[0] || "PRO")}</div>
                <input type="file" ref={avatarInputRef} onChange={onAvatarFileChange} accept="image/*" className="hidden" />
                <GenderAvatarBadge gender={profile?.gender} size="sm" />
                <div className="absolute -bottom-3 -right-6 z-20"><StatusBadge tag={profile?.status_tag ?? null} /></div>
              </div>

              <div className="text-center animate-fadeIn mt-2">
                <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">{profile?.first_name} {profile?.last_name}</h1>
                <p className="text-sm font-mono text-blue-400 mb-2">@{profile?.handle || "ID_未設定"}</p>

                {profile?.is_player !== false && (
                  <ProfilePhysicalStatsRow
                    age={profile?.age}
                    showAge={profile?.show_age}
                    heightCm={profile?.height_cm}
                    weightKg={profile?.weight_kg}
                    showPhysicalStats={profile?.show_physical_stats}
                    size="md"
                    className="mb-4"
                  />
                )}

                <p className="text-sm font-bold text-zinc-400 mb-4">{profile?.headline || "設定你的場上宣言"}</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {profile?.is_player !== false && <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20">👤 運動員</span>}
                  {profile?.is_coach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20"><CoachRoleLabel /></span>}
                  {profile?.is_physio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20"><PhysioRoleLabel /></span>}
                </div>
                {user?.id && (
                  <ProfileCardBio
                    userId={user.id}
                    bio={profile?.bio}
                    onSaved={(nextBio) => {
                      setProfile((prev) => (prev ? { ...prev, bio: nextBio || null } : prev));
                      setEditForm((prev: Record<string, unknown>) => ({ ...prev, bio: nextBio }));
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Mobile sticky hub icons (outside profile card) ── */}
          <div className="order-2 col-span-1 lg:hidden">
            <ProfileHubMobileBar
              activeTab={privateTab === "dashboard" ? "home" : privateTab}
              onTab={(tab) => handlePrivateTabSwitch(tab)}
            />
          </div>

          {/* ── Right content ── */}
          <div className="order-3 lg:order-2 lg:col-span-8 xl:col-span-9 lg:col-start-5 xl:col-start-4 flex flex-col min-w-0" ref={contentRef}>
            <ProfileHubTabNav
              activeTab={privateTab === "dashboard" ? "home" : privateTab}
              onTab={(tab) => handlePrivateTabSwitch(tab)}
            />

            {privateTab === "home" && profile ? (
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
                    hasUncontactedCoachEnquiries={uncontactedCoachEnquiries > 0}
                    hasUncontactedPhysioEnquiries={uncontactedPhysioEnquiries > 0}
                    uncontactedCoachServiceIds={uncontactedCoachServiceIds}
                    uncontactedPhysioServiceIds={uncontactedPhysioServiceIds}
                    onCoachBackend={showCoach ? () => router.push("/dashboard/coach") : undefined}
                    onPhysioBackend={showPhysio ? () => router.push("/dashboard/physio") : undefined}
                    onAthleteBackend={showPlayer ? () => handlePrivateTabSwitch("dashboard") : undefined}
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
                        isUploadBusy={isUploadingMedia || cropTarget === "highlight"}
                        onOpenMediaModal={() => {
                          if (isUploadingMedia || cropTarget !== null) return;
                          setIsMediaModalOpen(true);
                        }}
                      />
                    }
                    athleteFeed={<FeedTab profile={profile} avatarSrc={avatarSrc} />}
                  />
            ) : privateTab !== "home" ? (
              <div className="flex-1">
                  {privateTab === "edit" && (
                    <ProfileEditTab
                      editForm={editForm}
                      setEditForm={setEditForm}
                      locationData={locationData}
                      handleStatus={handleStatus}
                      isSaving={isSaving}
                      avatarSrc={avatarSrc}
                      onAvatarClick={() => avatarInputRef.current?.click()}
                      onSave={handleSaveProfile}
                      onCancel={handleCancelEdit}
                    />
                  )}
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
                  {privateTab === "settings" && (
                    <ProfileSettingsList onNavigate={(href) => router.push(href)} />
                  )}
                  {privateTab === "events" && user && (
                    <MyEventsTab embedded userId={user.id} />
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
                        {!hasBoth && <div className="bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl py-16 text-center px-6"><p className="text-4xl mb-4">🛡️</p><p className="text-zinc-400 font-bold text-sm mb-2">你尚未加入或建立任何團隊</p><a href="/team/create" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.2)]">＋ 建立球隊／群組</a></div>}
                        {managedTeams.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 pl-1">我管理的團隊 (Admin)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {managedTeams.map(({ teams: t }) => {
                                if (!t) return null;
                                const emoji = TEAM_SPORT_EMOJI[t.sport_category] ?? "🏅";
                                const zh = TEAM_SPORT_ZH[t.sport_category] ?? t.sport_category;
                                const name = t.name_en || t.name_zh || "未命名";
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
                                const name = t.name_en || t.name_zh || "未命名";
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
            ) : null}
          </div>
        </div>
      </div>

      <ImageCropModal
        open={cropTarget !== null}
        imageSrc={cropImageSrc}
        preset={cropTarget === "avatar" ? "avatar" : "square"}
        filename={cropTarget === "avatar" ? "avatar.jpg" : "highlight.jpg"}
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />

      {/* ── Sport Modal ── */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white mb-6">{editingUserSportId ? "編輯技術特長" : "添入技術特長"}</h3>
            <form key={editingUserSportId ?? "new-sport"} onSubmit={handleSaveSport} className="space-y-5 text-sm">
              <p className="text-xs text-blue-300/90 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
                💡 僅運動項目為必填。其餘欄位選填，但填寫越完整，在人脈搜尋與配對中的曝光率越高。
              </p>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">選擇運動項目</label>
                <SportCategoryPicker
                  value={selectedSportSlug}
                  onChange={(id: SportCategoryId) => {
                    setSelectedSportSlug(id);
                    if (editingUserSportId && id === sportModalInitialSlug) return;
                    setSportDynamicData({});
                    setSportModalInitialSlug(id);
                  }}
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
                    <FormSelect
                      value={(sportDynamicData[field.key] as string) || ""}
                      onValueChange={(value) => setSportDynamicData({ ...sportDynamicData, [field.key]: value })}
                      options={(field.options ?? []).map((opt) => ({ value: opt, label: opt }))}
                      placeholder="-- 請選擇 --"
                      triggerClassName="bg-slate-900 border-slate-700 rounded-xl p-3.5 font-bold"
                    />
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
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">1. 歸屬類別</label><FormSelect value={uploadMediaSport} onValueChange={setUploadMediaSport} options={userSports.map(us => ({ value: us.sports?.name ?? "", label: us.sports?.name ?? "" })).filter(opt => opt.value)} placeholder="-- 選擇專長 --" triggerClassName="bg-slate-900 border-slate-800 rounded-xl p-3.5 font-bold" /></div>
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">2. 選擇檔案</label><div className="border-2 border-dashed border-slate-800 hover:border-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden"><input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia || cropTarget === "highlight"} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" /><span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : cropTarget === "highlight" ? "裁切處理中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span></div></div>
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