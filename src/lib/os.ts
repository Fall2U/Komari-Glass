/** OS icons are served by Komari core at /images/logo/ */

interface OSConfig {
  name: string;
  image: string;
  keywords: string[];
}

const osConfigs: OSConfig[] = [
  {
    name: "AlmaLinux",
    image: "/images/logo/os-alma.svg",
    keywords: ["alma", "almalinux"],
  },
  {
    name: "Alpine Linux",
    image: "/images/logo/os-alpine.webp",
    keywords: ["alpine"],
  },
  {
    name: "Arch Linux",
    image: "/images/logo/os-arch.svg",
    keywords: ["arch", "archlinux"],
  },
  {
    name: "Armbian",
    image: "/images/logo/os-armbian.svg",
    keywords: ["armbian"],
  },
  {
    name: "CentOS",
    image: "/images/logo/os-centos.svg",
    keywords: ["centos"],
  },
  {
    name: "Debian",
    image: "/images/logo/os-debian.svg",
    keywords: ["debian", "deb"],
  },
  {
    name: "Fedora",
    image: "/images/logo/os-fedora.svg",
    keywords: ["fedora"],
  },
  {
    name: "FreeBSD",
    image: "/images/logo/os-freebsd.svg",
    keywords: ["freebsd", "bsd"],
  },
  {
    name: "Kali Linux",
    image: "/images/logo/os-kail.svg",
    keywords: ["kali", "kail"],
  },
  {
    name: "OpenWrt",
    image: "/images/logo/os-openwrt.svg",
    keywords: ["openwrt", "immortalwrt"],
  },
  {
    name: "iStoreOS",
    image: "/images/logo/os-istore.png",
    keywords: ["istore"],
  },
  {
    name: "Ubuntu",
    image: "/images/logo/os-ubuntu.svg",
    keywords: ["ubuntu", "elementary"],
  },
  {
    name: "Windows",
    image: "/images/logo/os-windows.svg",
    keywords: ["windows", "win", "microsoft"],
  },
  {
    name: "Rocky Linux",
    image: "/images/logo/os-rocky.svg",
    keywords: ["rocky"],
  },
  {
    name: "openSUSE",
    image: "/images/logo/os-openSUSE.svg",
    keywords: ["suse", "opensuse"],
  },
  {
    name: "NixOS",
    image: "/images/logo/os-nix.svg",
    keywords: ["nix", "nixos"],
  },
  {
    name: "fnOS",
    image: "/images/logo/os-fnos.ico",
    keywords: ["fnos", "trim connect"],
  },
  {
    name: "Proxmox VE",
    image: "/images/logo/os-proxmox.ico",
    keywords: ["proxmox", "pve"],
  },
  {
    name: "Synology DSM",
    image: "/images/logo/os-synology.ico",
    keywords: ["synology", "dsm"],
  },
  {
    name: "macOS",
    image: "/images/logo/os-macos.svg",
    keywords: ["macos", "darwin"],
  },
];

const DEFAULT_OS = {
  name: "Linux",
  image: "/images/logo/linux.svg",
};

function getOSInfo(os: string): { name: string; image: string } {
  const lower = (os || "").toLowerCase();
  for (const cfg of osConfigs) {
    if (cfg.keywords.some((k) => lower.includes(k))) {
      return { name: cfg.name, image: cfg.image };
    }
  }
  return DEFAULT_OS;
}

export function getOSImage(os: string): string {
  return getOSInfo(os).image;
}

export function getOSName(os: string): string {
  return getOSInfo(os).name;
}
