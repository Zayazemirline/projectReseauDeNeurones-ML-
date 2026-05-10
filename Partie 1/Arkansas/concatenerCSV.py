import pandas as pd


csv1 = r'C:\Users\yousr\Downloads\drive-download-20260421T230837Z-3-001\arkansas_corn_1522.csv'
csv2 = r'C:\Users\yousr\Downloads\drive-download-20260421T230837Z-3-001\arkansas_cotton_762.csv'
csv3 = r'C:\Users\yousr\Downloads\drive-download-20260421T230837Z-3-001\arkansas_other_616.csv'
csv4 = r'C:\Users\yousr\Downloads\drive-download-20260421T230837Z-3-001\arkansas_rice_2423.csv'
csv5 = r'C:\Users\yousr\Downloads\drive-download-20260421T230837Z-3-001\arkansas_soybeans_4677.csv'

df1 = pd.read_csv(csv1)
df2 = pd.read_csv(csv2)
df3 = pd.read_csv(csv3)
df4 = pd.read_csv(csv4)
df5 = pd.read_csv(csv5)


# Fusionner
df = pd.concat([df1, df2, df3, df4,df5], ignore_index=True)
print("Shape fusionné:", df.shape)

# Nettoyage colonnes inutiles
cols_to_drop = [c for c in ['.geo', 'system:index', 'cropland'] if c in df.columns]
df = df.drop(columns=cols_to_drop)

if 'random' in df.columns:
    df = df.drop(columns=['random'])

# Supprimer nulls
df = df.dropna()
print("Shape après nettoyage:", df.shape)

# Mapper les classes comme dans le papier
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