import { SearchCriteria } from './search-criteria.interface';

/**
 * Interface for the complete search request object that contains
 * a search ID and an array of search criteria.
 */
export interface SearchRequest {
    title: {
        id: string;
        label: string;
    };
    fields: SearchCriteria[];
}