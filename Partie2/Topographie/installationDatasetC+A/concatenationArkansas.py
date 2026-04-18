import pandas as pd

# Charger les 2 parties
part1 = pd.read_csv(r'C:\Users\HP\Downloads\Arkansas_topographie1_5000pts.csv')
part2 = pd.read_csv(r'C:\Users\HP\Downloads\Arkansas_topographie2_5000pts.csv')

print("Part1 shape:", part1.shape)
print("Part2 shape:", part2.shape)

# Fusionner
df = pd.concat([part1, part2], ignore_index=True)
print("Shape fusionné:", df.shape)

# Nettoyage colonnes inutiles
cols_to_drop = [c for c in ['.geo', 'system:index', 'cropland'] if c in df.columns]
df = df.drop(columns=cols_to_drop)

# Supprimer nulls
df = df.dropna()
print("Shape après nettoyage:", df.shape)

# Mapper les classes
label_map = {
    1: 'Corn',
    2: 'Cotton',
    3: 'Rice',
    5: 'Soybeans'
}

df['crop_name'] = df['crop_label'].apply(
    lambda x: label_map.get(int(x), 'Others')
)

print("\nDistribution des classes:")
print(df['crop_name'].value_counts())

print("\nPourcentages:")
print((df['crop_name'].value_counts() / len(df) * 100).round(2))

# Sauvegarder
df.to_csv('Arkansas_full_clean.csv', index=False)
print("\nFichier sauvegardé : Arkansas_full_clean.csv")
