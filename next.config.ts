import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  experimental: {
    /**
     * 關掉動態頁面的客戶端路由快取。
     *
     * 這裡每一頁都是「這個使用者、這個語言、這一天」的資料，而且使用者會直接編輯
     * （指定某天、排集中期、標記讀完）。預設 30 秒的 staleTime 會讓剛存好的東西
     * 要等或要手動重整才看得到——server action 導回同一個網址時尤其明顯，
     * 那個網址在快取裡，等於什麼都沒發生。
     *
     * 伺服端該快取的仍然有快取（lesson-data 那層），這裡關掉的只是瀏覽器端。
     */
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
