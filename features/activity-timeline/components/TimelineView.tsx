"use client";

import { useMemo, useCallback } from "react";
import { TimelineEvent, isEventVisible } from "../types";
import { TimelineEntry } from "./TimelineEntry";
import { Button } from "../../../components/Button";

interface TimelineViewProps {
  events: TimelineEvent[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  forPublicView?: boolean;
}

/**
 * Renders a filtered timeline view with pagination
 * Respects event visibility rules
 */
export function TimelineView({
  events,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  forPublicView = false,
}: TimelineViewProps) {
  const visibleEvents = useMemo(() => {
    return events.filter((e) => isEventVisible(e, forPublicView));
  }, [events, forPublicView]);

  const sortedEvents = useMemo(() => {
    return [...visibleEvents].sort((a, b) => b.timestamp - a.timestamp);
  }, [visibleEvents]);

  const handleLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);

  if (sortedEvents.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sortedEvents.map((event) => (
          <TimelineEntry key={event.id} event={event} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
