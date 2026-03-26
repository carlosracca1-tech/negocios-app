"use client";

import { TimelineEvent } from "@/types";

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 20 }}>
        Timeline ({events.length})
      </div>

      {sortedEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#999" }}>
          Sin eventos registrados
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 3, top: 0, bottom: 0, width: 1, background: "#e0e0e0" }} />

          {sortedEvents.map((event, i) => (
            <div key={event.id} style={{ marginBottom: 20, position: "relative" }}>
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: -15,
                  top: 2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#2E75B6",
                  border: "3px solid #fff",
                  boxShadow: "0 0 0 1px #e0e0e0",
                }}
              />

              {/* Content */}
              <div style={{ paddingTop: 0 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                  {new Date(event.date).toLocaleDateString("es-AR")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>
                  {event.action}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {event.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
