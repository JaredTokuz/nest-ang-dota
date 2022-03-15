import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { Observable } from 'rxjs';
import { Hero } from '../model/heroes';
import { HeroesStore } from '../services/heroes.store';
import { SelectedHeroStore } from '../services/selected-hero.store';

@Component({
    selector: 'hero-cards',
    templateUrl: './hero-cards.component.html',
    styleUrls: ['./hero-cards.component.scss'],
})
export class HeroCardsComponent implements OnInit {
    cdnRootUrl = 'https://cdn.dota2.com';

    heroes$: Observable<Hero[]> = this.heroesStore.heroes$;
    selectedHero$ = this.selectedHeroStore.hero$;

    @ViewChild('summaryDrawer') summaryDrawer: MatDrawer;

    constructor(
        private heroesStore: HeroesStore,
        private selectedHeroStore: SelectedHeroStore
    ) {}

    ngOnInit(): void {}

    cdnUrl(urlPath: string) {
        return this.cdnRootUrl + urlPath;
    }

    selectHero(hero: Hero) {
        const current = this.selectedHeroStore.getSelected();
        if (current?.constants?.id !== hero.id) {
            this.selectedHeroStore.select(hero);
            this.summaryController.open();
        } else {
            this.selectedHeroStore.clear();
            this.summaryController.close();
        }
    }

    get summaryController() {
        return {
            toggle: () => {
                this.summaryDrawer.toggle();
            },
            open: () => {
                if (!this.summaryDrawer.opened) {
                    this.summaryDrawer.open();
                }
            },
            close: () => {
                if (this.summaryDrawer.opened) {
                    this.summaryDrawer.close();
                }
            },
        };
    }
}
