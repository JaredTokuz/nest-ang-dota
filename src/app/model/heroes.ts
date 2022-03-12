export interface Heroes {
    id: number;
    localized_name: string;
    name: string;
    icon: string;
}

export function sortHeroesById(c1: Heroes, c2: Heroes) {
    return c1.id - c2.id;
}
