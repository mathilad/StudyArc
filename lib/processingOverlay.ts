export type ProcessingState = {
  id: string;
  title: string;
  message: string;
  progress: number | null;
  done: boolean;
};

type Listener = (state: ProcessingState | null) => void;

let current: ProcessingState | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach(listener => listener(current));
const clamp = (value: number | null | undefined) => value == null ? null : Math.max(0, Math.min(1, value));

export function subscribeProcessing(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function beginProcessing(title: string, message: string, progress: number | null = null) {
  const id = `processing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  current = { id, title, message, progress: clamp(progress), done: false };
  emit();
  return id;
}

export function updateProcessing(id: string, update: Partial<Omit<ProcessingState, "id">>) {
  if (!current || current.id !== id) return;
  current = {
    ...current,
    ...update,
    progress: update.progress === undefined ? current.progress : clamp(update.progress),
  };
  emit();
}

export function endProcessing(id: string) {
  if (!current || current.id !== id) return;
  current = null;
  emit();
}

export function completeProcessing(id: string, message = "Completed", holdMs = 550) {
  if (!current || current.id !== id) return;
  current = { ...current, message, progress: 1, done: true };
  emit();
  setTimeout(() => {
    if (!current || current.id !== id) return;
    current = null;
    emit();
  }, Math.max(0, holdMs));
}
