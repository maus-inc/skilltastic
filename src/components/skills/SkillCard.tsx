import { motion } from "motion/react";
import { Badge } from "../ui/Badge";
import { provider } from "../ui/providers";
import { RollingLabel } from "../ui/RollingLabel";
import { Switch } from "../ui/Switch";
import type { Skill, ToolEntry } from "../../types";

interface SkillCardProps {
  skill: Skill;
  toolEntries: ToolEntry[];
  onToggle: (skill: Skill) => void;
  onOpen: (skill: Skill) => void;
}

export function SkillCard({ skill, toolEntries, onToggle, onOpen }: SkillCardProps) {
  // Every tool whose read-set includes this skill's folder sees it.
  const seers = toolEntries.filter((t) => t.folders.some((f) => f.tool === skill.tool));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.8 }}
      className={`skill-card ${skill.enabled ? "" : "disabled"}`}
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
          <Badge>{skill.scope}</Badge>
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
    </motion.div>
  );
}
