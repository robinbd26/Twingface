// Lightweight inline SVG icon set (stroke-based, ~lucide style) for the dashboard.
type IconProps = { size?: number; className?: string; fill?: string };

function Svg({ size = 22, className, fill = 'none', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill={fill} stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d='M3 10.8 12 3l9 7.8V20a1.5 1.5 0 0 1-1.5 1.5H15V14H9v7.5H4.5A1.5 1.5 0 0 1 3 20z' /></Svg>
);
export const VideoIcon = (p: IconProps) => (
  <Svg {...p}><rect x='2' y='6' width='14' height='12' rx='2' /><path d='m16 10.5 5.223 3.482a.5.5 0 0 1-.223.918V7.1a.5.5 0 0 1 .223.918z' /></Svg>
);
export const StoreIcon = (p: IconProps) => (
  <Svg {...p}><path d='m2 7 4.41-3.36a1 1 0 0 1 1.233.05L12 6l4.357-2.31a1 1 0 0 1 1.233.05L22 7v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z' /><path d='M4 10v8M20 10v8M9 22v-6M15 22v-6' /></Svg>
);
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' /><circle cx='9' cy='7' r='4' /><path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' /></Svg>
);
export const GamepadIcon = (p: IconProps) => (
  <Svg {...p}><path d='M6 12h4M8 10v4m5-1h.01M17 13h.01' /><rect x='2' y='6' width='20' height='12' rx='4' /></Svg>
);
export const GridIcon = (p: IconProps) => (
  <Svg {...p}><rect x='3' y='3' width='7' height='7' rx='1' /><rect x='14' y='3' width='7' height='7' rx='1' /><rect x='3' y='14' width='7' height='7' rx='1' /><rect x='14' y='14' width='7' height='7' rx='1' /></Svg>
);
export const ChatIcon = (p: IconProps) => (
  <Svg {...p}><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' /></Svg>
);
export const BellIcon = (p: IconProps) => (
  <Svg {...p}><path d='M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' /><path d='M13.73 21a2 2 0 0 1-3.46 0' /></Svg>
);
export const SpeakerOnIcon = (p: IconProps) => (
  <Svg {...p}><path d='M11 5 6 9H2v6h4l5 4z' /><path d='M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14' /></Svg>
);
export const SpeakerOffIcon = (p: IconProps) => (
  <Svg {...p}><path d='M11 5 6 9H2v6h4l5 4z' /><path d='m22 9-6 6M16 9l6 6' /></Svg>
);
export const MicIcon = (p: IconProps) => (
  <Svg {...p}><rect x='9' y='2' width='6' height='12' rx='3' /><path d='M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8' /></Svg>
);
export const MicOffIcon = (p: IconProps) => (
  <Svg {...p}><path d='m2 2 20 20' /><path d='M9 9v-1a3 3 0 0 1 5.12-2.12M15 9.34V5a3 3 0 0 0-5.94-.6' /><path d='M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23' /><path d='M12 19v4M8 23h8' /></Svg>
);
export const CameraOffIcon = (p: IconProps) => (
  <Svg {...p}><path d='m2 2 20 20' /><path d='M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8' /><path d='M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-1h4' /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d='M20 6 9 17l-5-5' /></Svg>
);
export const MoonIcon = (p: IconProps) => (
  <Svg {...p}><path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' /></Svg>
);
export const SunIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='4' /><path d='M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='11' cy='11' r='8' /><path d='m21 21-4.3-4.3' /></Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d='M18 6 6 18M6 6l12 12' /></Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}><path d='m6 9 6 6 6-6' /></Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}><path d='m9 18 6-6-6-6' /></Svg>
);
export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}><path d='M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915' /><circle cx='12' cy='12' r='3' /></Svg>
);
export const HelpIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='10' /><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' /></Svg>
);
export const FlagIcon = (p: IconProps) => (
  <Svg {...p}><path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' /><path d='M4 22v-7' /></Svg>
);
export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='m16 17 5-5-5-5M21 12H9' /></Svg>
);
export const ImageIcon = (p: IconProps) => (
  <Svg {...p}><rect x='3' y='3' width='18' height='18' rx='2' /><circle cx='9' cy='9' r='2' /><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' /></Svg>
);
export const SmileIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='10' /><path d='M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01' /></Svg>
);
export const ThumbsUpIcon = (p: IconProps) => (
  <Svg {...p}><path d='M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z' /></Svg>
);
export const CommentIcon = (p: IconProps) => (
  <Svg {...p}><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' /></Svg>
);
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='18' cy='5' r='3' /><circle cx='6' cy='12' r='3' /><circle cx='18' cy='19' r='3' /><path d='m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98' /></Svg>
);
export const SendIcon = (p: IconProps) => (
  <Svg {...p}><path d='m22 2-7 20-4-9-9-4z' /><path d='M22 2 11 13' /></Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}><path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' /></Svg>
);
export const SparklesIcon = (p: IconProps) => (
  <Svg {...p}><path d='M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z' /></Svg>
);
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='10' /><path d='M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' /></Svg>
);
export const CompassIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='10' /><path d='m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z' /></Svg>
);
export const CameraIcon = (p: IconProps) => (
  <Svg {...p}><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' /><circle cx='12' cy='13' r='4' /></Svg>
);
export const PlusCircleIcon = (p: IconProps) => (
  <Svg {...p}><circle cx='12' cy='12' r='10' /><path d='M12 8v8M8 12h8' /></Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}><path d='M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z' /></Svg>
);
export const GraduationIcon = (p: IconProps) => (
  <Svg {...p}><path d='M22 10 12 5 2 10l10 5 10-5z' /><path d='M6 12v5c3 3 9 3 12 0v-5' /></Svg>
);

