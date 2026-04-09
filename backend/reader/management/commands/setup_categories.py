from django.core.management.base import BaseCommand
from books.models import Category


class Command(BaseCommand):
    help = 'Create book categories (Wealth, Relationships, General)'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Wealth',
                'description': 'Books about financial success, investing, entrepreneurship, and wealth building'
            },
            {
                'name': 'Relationships',
                'description': 'Books about personal relationships, dating, marriage, family, and social skills'
            },
            {
                'name': 'General',
                'description': 'General books that don\'t fit into specific categories'
            }
        ]

        for cat_data in categories:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Category already exists: {category.name}'))

        self.stdout.write(self.style.SUCCESS('Categories setup completed!'))
