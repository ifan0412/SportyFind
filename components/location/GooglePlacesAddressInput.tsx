"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getGoogleMapsApiKey } from "@/lib/google-maps";

type PlacesResult = {
  formattedAddress: string;
  name: string;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              fields?: string[];
              componentRestrictions?: { country: string | string[] };
              types?: string[];
            }
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              name?: string;
            };
          };
        };
        event?: {
          clearInstanceListeners: (instance: unknown) => void;
        };
      };
    };
    __sfMapsPlacesPromise?: Promise<void>;
  }
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__sfMapsPlacesPromise) return window.__sfMapsPlacesPromise;

  window.__sfMapsPlacesPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-sf-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Maps script failed")));
      return;
    }
    const script = document.createElement("script");
    script.dataset.sfMaps = "1";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=zh-TW&region=HK`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Maps script failed"));
    document.head.appendChild(script);
  });

  return window.__sfMapsPlacesPromise;
}

export function GooglePlacesAddressInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called when user picks a Google suggestion (optional — for filling venue name). */
  onPlaceSelect?: (place: PlacesResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const apiKey = getGoogleMapsApiKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<InstanceType<
    NonNullable<NonNullable<NonNullable<Window["google"]>["maps"]>["places"]>["Autocomplete"]
  > | null>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const hintId = useId();

  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
    onChangeRef.current = onChange;
  }, [onPlaceSelect, onChange]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places) return;
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name"],
          componentRestrictions: { country: "hk" },
        });
        autocompleteRef.current = autocomplete;
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const formatted = (place.formatted_address || "").trim();
          const name = (place.name || "").trim();
          if (formatted) {
            onChangeRef.current(formatted);
            onPlaceSelectRef.current?.({ formattedAddress: formatted, name });
          } else if (name) {
            onChangeRef.current(name);
            onPlaceSelectRef.current?.({ formattedAddress: name, name });
          }
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [apiKey]);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={hintId}
        className={className}
      />
      <p id={hintId} className="text-[10px] text-zinc-500 leading-relaxed">
        {!apiKey || loadFailed
          ? "可自行輸入地址。設定 Google Maps API 金鑰後可啟用地圖建議。"
          : ready
            ? "輸入後選擇 Google 建議，或直接輸入自訂地址。"
            : "載入地圖建議中…亦可直接輸入地址。"}
      </p>
    </div>
  );
}
