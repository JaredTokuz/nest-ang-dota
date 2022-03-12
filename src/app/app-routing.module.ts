import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSerializer } from '@angular/router';
import { HeroCardsComponent } from './hero-cards/hero-cards.component';
import { CustomPreloadingStrategy } from './services/custom-preloading.strategy';

const routes: Routes = [
    {
        path: '',
        component: HeroCardsComponent,
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            preloadingStrategy:
                CustomPreloadingStrategy /** or do PreloadAllModules */,
            scrollPositionRestoration: 'enabled',
            paramsInheritanceStrategy: 'always',
            relativeLinkResolution: 'corrected',
            malformedUriErrorHandler: (
                error: URIError,
                urlSerializer: UrlSerializer,
                url: string
            ) => urlSerializer.parse('/page-not-found'),
        }),
    ],
    providers: [CustomPreloadingStrategy],
    exports: [RouterModule],
})
export class AppRoutingModule {}
