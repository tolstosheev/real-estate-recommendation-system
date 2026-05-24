import { useState, useRef, useEffect, useCallback } from 'react';
import { geocodeAddress, type GeocoderResult } from '@shared/api/geocoder.service';

export interface AddressAutocompleteState {
  addressSuggestions: GeocoderResult[];
  showSuggestions: boolean;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
  handleAddressChange: (value: string, onAddressChange: (address: string) => void) => void;
  selectAddressSuggestion: (result: GeocoderResult, onSelect: (result: GeocoderResult) => void) => void;
}

export function useAddressAutocomplete(): AddressAutocompleteState {
  const [addressSuggestions, setAddressSuggestions] = useState<GeocoderResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleAddressChange = useCallback((value: string, onAddressChange: (address: string) => void) => {
    onAddressChange(value);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    abortRef.current?.abort();

    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await geocodeAddress(value, controller.signal);
        if (results.length > 0) {
          setAddressSuggestions(results);
          setShowSuggestions(true);
        } else {
          setAddressSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setAddressSuggestions([]);
      }
    }, 300);
  }, []);

  const selectAddressSuggestion = useCallback((result: GeocoderResult, onSelect: (result: GeocoderResult) => void) => {
    onSelect(result);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  }, []);

  return {
    addressSuggestions,
    showSuggestions,
    suggestionsRef,
    handleAddressChange,
    selectAddressSuggestion,
  };
}
