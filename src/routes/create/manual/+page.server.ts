/**
 * @fileoverview Server load for /create/manual.
 *
 * Reads the `?type` URL search parameter so that the three nav tabs
 * (KWT / Grammar / Translation) open the editor pre-configured for
 * the correct exercise type.
 */

import type {PageServerLoad} from './$types.js';
import type {ExerciseType} from '$lib/constants.js';
import {EXERCISE_TYPES} from '$lib/constants.js';

export const load: PageServerLoad = ({url}) => {
    const raw = url.searchParams.get('type') ?? 'kwt';
    const initialType: ExerciseType = (EXERCISE_TYPES.includes(raw as ExerciseType)
        ? raw
        : 'kwt') as ExerciseType;

    return {initialType};
};