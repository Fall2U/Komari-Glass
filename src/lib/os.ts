/** OS icons are served by the Komari 1.3.0+ default theme at /assets/logo/. */

interface OSConfig {
  name: string;
  image: string;
  keywords: string[];
}

const osConfigs: OSConfig[] = [
  {
    name: "AlmaLinux",
    image: "/assets/logo/os-alma.svg",
    keywords: ["alma", "almalinux"],
  },
  {
    name: "Alpine Linux",
    image: "/assets/logo/os-alpine.webp",
    keywords: ["alpine"],
  },
  {
    name: "Arch Linux",
    image: "/assets/logo/os-arch.svg",
    keywords: ["arch", "archlinux"],
  },
  {
    name: "Armbian",
    image: "/assets/logo/os-armbian.svg",
    keywords: ["armbian"],
  },
  {
    name: "CentOS",
    image: "/assets/logo/os-centos.svg",
    keywords: ["centos"],
  },
  {
    name: "Debian",
    image: "/assets/logo/os-debian.svg",
    keywords: ["debian", "deb"],
  },
  {
    name: "Fedora",
    image: "/assets/logo/os-fedora.svg",
    keywords: ["fedora"],
  },
  {
    name: "Gentoo",
    image: "/assets/logo/os-gentoo.svg",
    keywords: ["gentoo"],
  },
  {
    name: "Red Hat Enterprise Linux",
    image: "/assets/logo/os-redhat.svg",
    keywords: ["red hat", "redhat", "rhel"],
  },
  {
    name: "Linux Mint",
    image: "/assets/logo/os-mint.svg",
    keywords: ["linux mint", "mint"],
  },
  {
    name: "Manjaro",
    image: "/assets/logo/os-manjaro-.svg",
    keywords: ["manjaro"],
  },
  {
    name: "FreeBSD",
    image: "/assets/logo/os-freebsd.svg",
    keywords: ["freebsd", "bsd"],
  },
  {
    name: "Kali Linux",
    image: "/assets/logo/os-kail.svg",
    keywords: ["kali", "kail"],
  },
  {
    name: "OpenWrt",
    image: "/assets/logo/os-openwrt.svg",
    keywords: ["openwrt", "immortalwrt"],
  },
  {
    name: "iStoreOS",
    image: "/assets/logo/os-istore.png",
    keywords: ["istore"],
  },
  {
    name: "QNAP QTS",
    image: "/assets/logo/os-qnap.svg",
    keywords: ["qnap", "qts"],
  },
  {
    name: "Astra Linux",
    image: "/assets/logo/os-astar.png",
    keywords: ["astra"],
  },
  {
    name: "Orange Pi",
    image: "/assets/logo/os-orange-pi.svg",
    keywords: ["orange pi", "orangepi"],
  },
  {
    name: "EulerOS",
    image: "/assets/logo/os-huawei.svg",
    keywords: ["euleros", "openeuler", "huawei"],
  },
  {
    name: "Alibaba Cloud Linux",
    image: "/assets/logo/alibabacloud-color.svg",
    keywords: ["alibaba cloud", "aliyun", "alinux"],
  },
  {
    name: "OpenCloudOS",
    image: "/assets/logo/os-OpenCloudOS.png",
    keywords: ["opencloudos"],
  },
  {
    name: "Unraid",
    image: "/assets/logo/os-unraid.svg",
    keywords: ["unraid"],
  },
  {
    name: "Ubuntu",
    image: "/assets/logo/os-ubuntu.svg",
    keywords: ["ubuntu", "elementary"],
  },
  {
    name: "Windows",
    image: "/assets/logo/os-windows.svg",
    keywords: ["windows", "win", "microsoft"],
  },
  {
    name: "Rocky Linux",
    image: "/assets/logo/os-rocky.svg",
    keywords: ["rocky"],
  },
  {
    name: "openSUSE",
    image: "/assets/logo/os-openSUSE.svg",
    keywords: ["suse", "opensuse"],
  },
  {
    name: "NixOS",
    image: "/assets/logo/os-nix.svg",
    keywords: ["nix", "nixos"],
  },
  {
    name: "fnOS",
    image: "/assets/logo/os-fnos.ico",
    keywords: ["fnos", "trim connect"],
  },
  {
    name: "Proxmox VE",
    image: "/assets/logo/os-proxmox.ico",
    keywords: ["proxmox", "pve"],
  },
  {
    name: "Synology DSM",
    image: "/assets/logo/os-synology.ico",
    keywords: ["synology", "dsm"],
  },
  {
    name: "macOS",
    image: "/assets/logo/os-macos.svg",
    keywords: ["macos", "darwin"],
  },
];

const DEFAULT_OS = {
  name: "Linux",
  image: "/assets/logo/linux.svg",
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
