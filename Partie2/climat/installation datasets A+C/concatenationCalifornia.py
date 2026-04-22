import pandas as pd

# =============================
# 1. Charger les deux CSV
# =============================
csv1 = r'C:\Users\yousr\Downloads\California_climate_part1.csv'
csv2 = r'C:\Users\yousr\Downloads\California_climate_part2.csv'

df1 = pd.read_csv(csv1)
df2 = pd.read_csv(csv2)

print("Part1 shape:", df1.shape)
print("Part2 shape:", df2.shape)

# =============================
# 2. Concaténer
# =============================
df = pd.concat([df1, df2], ignore_index=True)
print("Shape fusionné:", df.shape)

# =============================
# 3. Nettoyage colonnes inutiles
# =============================
cols_to_drop = [c for c in ['.geo', 'system:index', 'cropland'] if c in df.columns]
df = df.drop(columns=cols_to_drop)

# =============================
# 4. Supprimer les valeurs nulles
# =============================
df = df.dropna()
print("Shape après nettoyage:", df.shape)

# =============================
# 5. Mapping des classes
# =============================
label_map = {
    36: 'Alfalfa',
    69: 'Grapes',
    3: 'Rice',
    204: 'Pistachios',
    75: 'Almonds'
}

df['crop_name'] = df['crop_label'].apply(
    lambda x: label_map.get(int(x), 'Others')
)

# =============================
# 6. Analyse des classes
# =============================
print("\nDistribution des classes:")
print(df['crop_name'].value_counts())

print("\nPourcentages:")
print((df['crop_name'].value_counts() / len(df) * 100).round(2))

# =============================
# 7. Sauvegarde
# =============================
df.to_csv('California_full_clean.csv', index=False)

print("\nFichier sauvegardé : California_full_clean.csv")
