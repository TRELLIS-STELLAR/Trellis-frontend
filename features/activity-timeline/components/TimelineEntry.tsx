import { TimelineEvent, EVENT_TYPE_LABELS } from "../types";

interface TimelineEntryProps {
  event: TimelineEvent;
}

/**
 * Renders a single timeline entry with stable link to resource
 */
export function TimelineEntry({ event }: TimelineEntryProps) {
  const label = EVENT_TYPE_LABELS[event.type];
  const formattedDate = new Date(event.timestamp).toLocaleString();

  return (
    <div className="border-l-2 border-amber-200 pl-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">{label}</h3>
          <p className="mt-1 text-sm text-gray-700">{event.description}</p>
          {event.resourceUrl && (
            <a
              href={event.resourceUrl}
              className="mt-2 inline-block text-sm text-amber-600 hover:underline"
            >
              View Details →
            </a>
          )}
        </div>
        <time className="whitespace-nowrap text-xs text-gray-500">{formattedDate}</time>
      </div>
    </div>
  );
}
