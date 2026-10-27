/** Temporary placeholder shown until a feature page is implemented. */
import { StatePanel } from '@/components/ui/States';
import { Construction } from 'lucide-react';

export function Placeholder({ title, stage }: { title: string; stage: string }) {
  return (
    <StatePanel
      icon={<Construction className="h-10 w-10 text-periwinkle" aria-hidden />}
      title={title}
      description={`${stage} — coming in the next delivery stage.`}
    />
  );
}
