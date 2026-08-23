import { AnimatePresence } from "motion/react";
import type { Skill, ToolEntry } from "../../types";
import { stableSkillKey } from "../../utils/stableSkillKey";
import { SkillCard } from "./SkillCard";

interface SkillListProps {
  skills: Skill[];
  toolEntries: ToolEntry[];
  emptyHint: string;
  onToggle: (skill: Skill) => void;
  onOpen: (skill: Skill) => void;
}

export function SkillList({ skills, toolEntries, emptyHint, onToggle, onOpen }: SkillListProps) {
  if (skills.length === 0) {
    return (
      <div className="empty-state">
        {emptyHint} Drop a folder with a <code>SKILL.md</code> file into the
        directory and it will show up here.
      </div>
    );
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {skills.map((skill, index) => (
        <SkillCard
          key={stableSkillKey(skill)}
          skill={skill}
          index={index}
          toolEntries={toolEntries}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </AnimatePresence>
  );
}
