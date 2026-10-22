import { format } from 'date-fns';
export const date = (value) => format(new Date(value), 'dd MMM yyyy');
export const time = (value) => format(new Date(value), 'HH:mm');
export const day = (value) => format(new Date(value), 'dd');
export const month = (value) => format(new Date(value), 'MMM');
export const localInput = (value) => format(new Date(value), "yyyy-MM-dd'T'HH:mm");
export const categories = ['Design', 'Music', 'Technology', 'Culture', 'Food', 'Community'];
