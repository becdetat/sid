import axios from 'axios';

export async function getCategories(): Promise<string[]> {
    const { data } = await axios.get<{ categories: string[] }>('/api/categories');
    return data.categories;
}
