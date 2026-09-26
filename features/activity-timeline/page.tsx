"use client";

import { useParams } from "next/navigation";
import { useActivityTimeline } from "./hooks/useActivityTimeline";
import { TimelineView } from "./components/TimelineView";
import { Card } from "../../components/Card";

/**
 * Activity Timeline Page
 * Displays user-facing activity timeline with privacy-aware event filtering
 */
export default function ActivityTimelinePage() {
  const params = useParams();
  const userId = params?.userId as string || "";

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useActivityTimeline(userId);

  if (isError) {
    return (
      <Card>
        <div className="text-center text-red-600">
          Failed to load timeline. Please try again.
        </div>
      </Card>
    );
  }

  const allEvents = data?.pages.flatMap((page) => page.events) || [];

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-bold text-amber-900">Activity Timeline</h1>
        <p className="mt-2 text-gray-600">Your account activity and important events</p>
      </Card>

      <TimelineView
        events={allEvents}
        onLoadMore={() => fetchNextPage()}
        hasMore={hasNextPage}
        isLoading={isLoading}
      />
    </div>
  );
}
