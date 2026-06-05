import {
  Bell,
  EyeOff,
  Globe,
  House,
  Lock,
  Mail,
  type LucideIcon,
  MessageCircleReply,
  PenSquare,
  Repeat2,
  Search,
  Smile,
  TrendingUp,
  Users,
  Waypoints,
} from "lucide-react";

function icon(Component: LucideIcon) {
  return function TileIcon() {
    return <Component className="tileTypeIcon" strokeWidth={2} />;
  };
}

export const HomeIcon = icon(House);
export const GlobeIcon = icon(Globe);
export const BellIcon = icon(Bell);
export const SearchIcon = icon(Search);
export const PenIcon = icon(PenSquare);
export const LocalIcon = icon(Waypoints);
export const SocialIcon = icon(Users);
export const TrendingIcon = icon(TrendingUp);
export const ReplyIcon = icon(MessageCircleReply);
export const RepeatIcon = icon(Repeat2);
export const SmileIcon = icon(Smile);
export const PublicVisibilityIcon = icon(Globe);
export const UnlistedVisibilityIcon = icon(EyeOff);
export const FollowersVisibilityIcon = icon(Lock);
export const DirectVisibilityIcon = icon(Mail);
