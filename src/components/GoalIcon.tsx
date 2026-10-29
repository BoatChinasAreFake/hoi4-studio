import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getGoalIconCandidates, getGoalIconsVersion, subscribeGoalIcons } from '../utils/goalIcons';

interface GoalIconProps {
  /** Sprite name as written in the focus, e.g. GFX_goal_generic_construct_civ_factory. */
  sprite: string;
  className?: string;
  alt?: string;
  /** Shown when none of the candidate images can be loaded. */
  fallback: React.ReactNode;
}

/**
 * Shows the real icon for a sprite first. If the image fails to load it moves on to the next candidate
 * (imported icons, close name variants, then generic backup icons) and finally to `fallback`.
 */
export const GoalIcon: React.FC<GoalIconProps> = ({ sprite, className, alt, fallback }) => {
  const version = useSyncExternalStore(subscribeGoalIcons, getGoalIconsVersion);
  const candidates = useMemo(() => getGoalIconCandidates(sprite), [sprite, version]);
  const [index, setIndex] = useState(0);

  // Start again from the best candidate whenever the sprite or the available icons change.
  useEffect(() => setIndex(0), [sprite, version]);

  if (index >= candidates.length) return <>{fallback}</>;
  return <img key={candidates[index]} src={candidates[index]} alt={alt ?? sprite} className={className} onError={() => setIndex((i) => i + 1)} />;
};
