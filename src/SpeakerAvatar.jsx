import { CHARACTERS } from './characters.mjs';
export function SpeakerAvatar({ role, className = '' }) {
  const character = CHARACTERS[role];
  return <span className={`speaker-avatar ${role} ${className}`}><img src={character.avatar} alt={character.name} /></span>;
}
