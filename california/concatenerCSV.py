import pandas as pd

# =============================
# 1. Charger les deux CSV de Californie
# =============================
csv1 = r'C:\Users\HP\Downloads\California_part1-1.csv'  # chemin vers ton premier CSV
csv2 = r'C:\Users\HP\Downloads\California_part2-2.csv'  # chemin vers ton second CSV

df1 = pd.read_csv(csv1)
df2 = pd.read_csv(csv2)

# =============================
# 2. Concaténer les deux CSV
# =============================
df = pd.concat([df1, df2], ignore_index=True)

# Mapper les classes comme dans le papier
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
# 3. Supprimer les colonnes inutiles
# =============================
for col in ['crop_label', '.geo', 'system:index']:
    if col in df.columns:
        df = df.drop(columns=[col])



# =============================
# 5. Sauvegarder le CSV final
# =============================
df.to_csv('California_combined_cleaned.csv', index=False)

print("CSV combiné et nettoyé créé : California_combined_cleaned.csv")
