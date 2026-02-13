import { createContext, useContext } from 'react';

interface GlobalLoadingContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const GlobalLoadingContext = createContext<GlobalLoadingContextType>({
  loading: false,
  setLoading: () => {},
});

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}
