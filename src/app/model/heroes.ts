export interface Hero {
    id: number;
    localized_name: string;
    name: string;
    icon: string;
}

export function sortHeroesById(c1: Hero, c2: Hero) {
    return c1.id - c2.id;
}
