import pandas as pd
from pathlib import Path

# Offline helper only.
# Convert the authoritative pickle into the compact CSV used by the WordPress plugin.
source = Path('atlas_master_frame_cxf_reconciled_v1.pkl')
target = Path('runtime-master-v1.csv')

df = pd.read_pickle(source)
slim = df[[
    'reference','lab_L','lab_a','lab_b','hex','rgb',
    'lambda_v2_nm','lambda_ee_nm','delta_lambda_nm',
    'mu2_nm2','sigma_star_nm','mu3_nm3',
    'lambda_v2_method','atlas_identity_valid'
]].copy()

slim.to_csv(target, index=False)
print(f'Wrote {target} with {len(slim)} rows')
