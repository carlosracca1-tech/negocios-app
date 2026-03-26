"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

interface ProjectSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  buyPrice: number;
  salePrice: number | null;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/projects");
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <div className={styles.userInfo}>
          <span>{session?.user?.name}</span>
          <button onClick={() => signOut()} className={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <h2>Projects</h2>
        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p>No projects found</p>
        ) : (
          <div className={styles.projectList}>
            {projects.map((project) => (
              <div key={project.id} className={styles.projectCard}>
                <h3>{project.name}</h3>
                <p>Type: {project.type}</p>
                <p>Status: {project.status}</p>
                <p>Buy Price: ${project.buyPrice.toLocaleString()}</p>
                {project.salePrice && (
                  <p>Sale Price: ${project.salePrice.toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
