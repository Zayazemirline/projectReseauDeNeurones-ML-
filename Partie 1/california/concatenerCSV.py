import pandas as pd


# =============================
# 1. Charger les 6 CSV
# =============================
csv1 = r'C:\Users\HP\Downloads\California_Rice_2037.csv'
csv2 = r'C:\Users\HP\Downloads\California_Grapes_2054.csv'
csv3 = r'C:\Users\HP\Downloads\California_Alfalfa_974.csv'
csv4 = r'C:\Users\HP\Downloads\California_Almonds_783.csv'
csv5 = r'C:\Users\HP\Downloads\California_Pistachios_640.csv'
csv6 = r'C:\Users\HP\Downloads\California_OtherCrops_3550.csv'

df1 = pd.read_csv(csv1)
df2 = pd.read_csv(csv2)
df3 = pd.read_csv(csv3)
df4 = pd.read_csv(csv4)
df5 = pd.read_csv(csv5)
df6 = pd.read_csv(csv6)

# =============================
# 2. Concaténer
# =============================
df = pd.concat([df1, df2, df3, df4, df5, df6], ignore_index=True)

print("Total avant filtrage :", len(df))

# =============================
# 3. Mapping (IDENTIQUE À TON CODE)
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
# 4. Limite à 10000 (CORRIGÉ)
# =============================
MAX_ROWS = 10000

if len(df) > MAX_ROWS:
    df_main = df[df['crop_name'] != 'Others']
    df_others = df[df['crop_name'] == 'Others']

    remaining = MAX_ROWS - len(df_main)

    if remaining > 0:
        df_others = df_others.sample(n=remaining, random_state=42)
        df = pd.concat([df_main, df_others], ignore_index=True)
    else:
        df = df_main

# =============================
# 5. Supprimer EXACTEMENT les mêmes colonnes
# =============================
for col in ['crop_label', '.geo', 'system:index']:
    if col in df.columns:
        df = df.drop(columns=[col])

# SUPPRESSION de la colonne random si elle existe
if 'random' in df.columns:
    df = df.drop(columns=['random'])

# =============================
# 6. Mélange (OK car tu le faisais déjà logiquement)
# =============================
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# =============================
# 7. Sauvegarde
# =============================
df.to_csv('California_combined_cleaned.csv', index=False)

print("CSV final créé : California_combined_cleaned.csv")
print("Shape final :", df.shape)