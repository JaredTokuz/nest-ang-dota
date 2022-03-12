import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Heroes } from '../model/heroes';
import { HeroesStore } from '../services/heroes.store';

@Component({
    selector: 'hero-cards',
    templateUrl: './hero-cards.component.html',
    styleUrls: ['./hero-cards.component.scss'],
})
export class HeroCardsComponent implements OnInit {
    cdnRootUrl = 'https://cdn.dota2.com';

    heroes$: Observable<Heroes[]> = this.heroesStore.heroes$;

    constructor(public heroesStore: HeroesStore) {}

    ngOnInit(): void {}

    cdnUrl(urlPath: string) {
        return this.cdnRootUrl + urlPath;
    }
}
