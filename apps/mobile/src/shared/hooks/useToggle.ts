import { useState, useCallback, useEffect } from 'react';
import { Dimensions } from 'react-native';

export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse, setValue } as const;
}

export function useBoolean(initialValue = false) {
  return useToggle(initialValue);
}
