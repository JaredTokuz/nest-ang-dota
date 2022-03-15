import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { Subscription, tap } from 'rxjs';
import { SelectedHeroStore } from './services/selected-hero.store';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
    title = 'boilerplate-nest-ang';

    // @ViewChild('summaryDrawer') summaryDrawer: MatDrawer;

    // selectedHero$ = this.selectedHeroStore.hero$;
    // selectedHeroSub: Subscription;

    constructor(private selectedHeroStore: SelectedHeroStore) {}

    ngAfterViewInit(): void {
        // this.selectedHeroSub = this.selectedHero$
        //     .pipe(
        //         tap((data) => {
        //             if (data) {
        //                 this.summaryController.open();
        //             } else {
        //                 this.summaryController.close();
        //             }
        //         })
        //     )
        //     .subscribe();
    }

    ngOnDestroy(): void {
        // this.selectedHeroSub.unsubscribe();
    }

    // get summaryController() {
    //     return {
    //         toggle: () => {
    //             this.summaryDrawer.toggle();
    //         },
    //         open: () => {
    //             if (!this.summaryDrawer.opened) {
    //                 this.summaryDrawer.open();
    //             }
    //         },
    //         close: () => {
    //             if (this.summaryDrawer.opened) {
    //                 this.summaryDrawer.close();
    //             }
    //         },
    //     };
    // }
}
