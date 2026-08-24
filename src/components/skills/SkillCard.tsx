import { useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Badge } from "../ui/Badge";
import { FolderIcon, GlobeIcon } from "../ui/icons";
import { provider } from "../ui/providers";
import { RollingLabel } from "../ui/RollingLabel";
import { Switch } from "../ui/Switch";
import type { Skill, ToolEntry } from "../../types";

interface SkillCardProps {
  skill: Skill;
  toolEntries: ToolEntry[];
  /** Position in the list — drives the entrance stagger. */
  index?: number;
  onToggle: (skill: Skill) => void;
  onOpen: (skill: Skill) => void;
}

export function SkillCard({ skill, toolEntries, index = 0, onToggle, onOpen }: SkillCardProps) {
  // Every tool whose read-set includes this skill's folder sees it.
  const seers = toolEntries.filter((t) => t.folders.some((f) => f.tool === skill.tool));

  // shooting-star hover: every hover rolls a fresh start angle and orbit
  // speed, so the star never launches from the same spot twice and a
  // hovered grid never sweeps in lockstep
  const [sweep, setSweep] = useState({ deg: 0, dur: 2.4 });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, transform: "translateY(8px) scale(0.99)" }}
      animate={{
        opacity: 1,
        transform: "translateY(0px) scale(1)",
        transition: {
          type: "spring",
          stiffness: 420,
          damping: 30,
          mass: 0.7,
          delay: Math.min(index * 0.025, 0.2),
        },
      }}
      exit={{ opacity: 0, transform: "scale(0.97)", transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.8 }}
      className={`skill-card ${skill.enabled ? "" : "disabled"}`}
      style={
        {
          "--sweep-offset": `${sweep.deg}deg`,
          "--sweep-dur": `${sweep.dur}s`,
        } as CSSProperties
      }
      onMouseEnter={() =>
        setSweep({ deg: Math.floor(Math.random() * 360), dur: 1.7 + Math.random() * 1.1 })
      }
      onClick={() => onOpen(skill)}
    >
      <div className="switch-col">
        <Switch
          checked={skill.enabled}
          onCheckedChange={() => onToggle(skill)}
          aria-label={`${skill.enabled ? "disable" : "enable"} ${skill.name}`}
          title={skill.enabled ? "disable" : "enable"}
        />
        <RollingLabel
          text={skill.enabled ? "on" : "off"}
          direction={skill.enabled ? "up" : "down"}
          className={skill.enabled ? "is-on" : ""}
        />
      </div>

      <div className="skill-main">
        <div className="skill-name-row">
          <span className="skill-name">{skill.name}</span>
          <Badge icon={provider(skill.tool).icon} iconAlt={provider(skill.tool).label}>
            {provider(skill.tool).label}
          </Badge>
        </div>
        {skill.description && <div className="skill-desc">{skill.description}</div>}
        <div className="skill-path">{skill.path}</div>
        {seers.length > 1 && (
          <div className="seen-by">
            <span className="seen-by-label">seen by</span>
            {seers.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className={`chip chip--iconic ${t.folders.find((f) => f.tool === skill.tool)?.role === "compat" ? "compat" : ""}`}
                title={t.label}
              >
                <img
                  className="chip-mark"
                  src={provider((t.folders.find((f) => f.role === "own") ?? t.folders[0]).tool).icon}
                  alt={t.label}
                />
                <span className="chip-label">{t.label}</span>
              </span>
            ))}
            {seers.length > 3 && <span className="chip more">+{seers.length - 3}</span>}
          </div>
        )}
      </div>
      <span
        className="chip chip--iconic scope-corner"
        data-tip={skill.scope === "user" ? "global skill" : "project skill"}
        data-tip-side="top"
      >
        {skill.scope === "user" ? <GlobeIcon size={10} /> : <FolderIcon size={10} />}
        <span className="chip-label">{skill.scope === "user" ? "global" : "project"}</span>
      </span>
    </motion.div>
  );
}
